#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { executeAskAI } from '../../api/rag/lib/ask-service.js';
import { toRagErrorAudit } from '../../api/rag/lib/errors.js';
import { classifyFailure } from './lib/failure-classifier.js';
import {
  evaluateCase,
  isSourceRefResolvable,
  renderS12BenchmarkReport,
  sanitizeEvidence,
  summarizeS12Rows,
} from './lib/s1_2_benchmark.js';

dotenv.config();

const ROOT = process.cwd();
const DATASET_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_2_syllabus_qa_core_v1.json');
const MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_2_syllabus_qa_core_v1_manifest.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_s1_2_benchmark_summary.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_s1_2_benchmark.md');

async function main() {
  if (!fs.existsSync(DATASET_FILE)) {
    throw new Error(`Dataset not found: ${DATASET_FILE}`);
  }

  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
  const manifest = fs.existsSync(MANIFEST_FILE) ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')) : null;

  if (!Array.isArray(dataset) || dataset.length < 200) {
    throw new Error('rag_s1_2_syllabus_qa_core_v1.json must contain at least 200 cases');
  }

  const rows = [];

  for (const item of dataset) {
    const started = Date.now();
    let response = null;
    let executionError = null;

    try {
      response = await executeAskAI(
        {
          query: item.query,
          syllabus_node_id: item.syllabus_node_id,
          subject_code: item.subject_code || null,
          internal_debug: false,
          language: item.metadata?.language || 'en',
        },
        {
          req: {
            request_id: `s1-2-${item.case_id}`,
            auth_user: null,
          },
          logger: () => {},
        },
      );
    } catch (error) {
      executionError = error;
      const errorAudit = toRagErrorAudit(error, { stage: 'execution' });
      response = {
        answer: '',
        uncertain: true,
        uncertain_reason_code: 'RETRIEVER_ERROR',
        topic_leakage_flag: false,
        topic_leakage_reason: null,
        evidence: [],
        retrieval_version: null,
        metrics: {
          evidence_traceability_rate: 0,
          cost_avg_usd_per_req: 0,
          cost_audit: null,
          retrieval_audit: {
            query_mode: 'execution_error',
            short_circuit_label: null,
            rpc_call_count: 0,
            hybrid_row_count: 0,
            dense_row_count: 0,
            lexical_row_count: 0,
            ...errorAudit,
          },
          latency_ms: Date.now() - started,
        },
      };
    }

    const evidence = Array.isArray(response.evidence) ? response.evidence : [];
    const retrievalAudit = response.metrics?.retrieval_audit || {};
    const traceableEvidenceCount = evidence.filter((entry) => isSourceRefResolvable(entry.source_ref)).length;
    const topEvidence = sanitizeEvidence(evidence, { limit: 3 });
    const top1 = topEvidence[0] || null;
    const evaluation = evaluateCase(item, response);
    const row = {
      case_id: item.case_id,
      syllabus_node_id: item.syllabus_node_id,
      current_topic_path: item.current_topic_path,
      subject_code: item.subject_code,
      difficulty: item.difficulty,
      query_family: item.query_family,
      risk_family: item.risk_family,
      topic_family: item.topic_family,
      expected_behavior: item.expected_behavior,
      expected_uncertain_reason_code: item.expected_uncertain_reason_code || null,
      query: item.query,
      reference_answer: item.reference_answer,
      expected_answer_keywords: item.expected_answer_keywords || [],
      min_answer_score: item.min_answer_score,
      answer: response.answer || '',
      uncertain: Boolean(response.uncertain),
      uncertain_reason_code: response.uncertain_reason_code || null,
      topic_leakage_flag: Boolean(response.topic_leakage_flag),
      topic_leakage_reason: response.topic_leakage_reason || null,
      retrieval_version: response.retrieval_version || null,
      retrieval_audit: retrievalAudit,
      latency_ms: Number(response.metrics?.latency_ms || Date.now() - started),
      cost_usd: Number(response.metrics?.cost_avg_usd_per_req || 0),
      cost_audit: response.metrics?.cost_audit || null,
      evidence_count: evidence.length,
      resolvable_evidence_count: traceableEvidenceCount,
      source_ref_unresolvable_count: Math.max(evidence.length - traceableEvidenceCount, 0),
      source_type: top1?.source_type || null,
      source_ref: top1?.source_ref || null,
      rank_key: top1?.rank_key ?? null,
      rank_sem: top1?.rank_sem ?? null,
      fused_rank: top1?.fused_rank ?? null,
      top_evidence: topEvidence,
      error_stage: retrievalAudit.error_stage || null,
      error_code: retrievalAudit.error_code || null,
      error_details: retrievalAudit.error_details || null,
      traceable: traceableEvidenceCount === evidence.length,
      execution_error: executionError ? String(executionError.message || executionError) : null,
      ...evaluation,
    };
    row.failure_class = classifyFailure(row);
    rows.push(row);
  }

  const summary = summarizeS12Rows(rows, manifest, {
    datasetPath: path.relative(ROOT, DATASET_FILE).replace(/\\/g, '/'),
    manifestPath: path.relative(ROOT, MANIFEST_FILE).replace(/\\/g, '/'),
    workflowSource: '.github/workflows/rag-s1-2-benchmark.yml',
  });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderS12BenchmarkReport(summary), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
