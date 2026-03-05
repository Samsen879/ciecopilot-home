#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_3_preflight.json');

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function main() {
  const requiredGateFiles = {
    s1_contract_gate: path.join(ROOT, 'runs', 'backend', 'rag_s1_contract_gate_summary.json'),
    s1_metric_gate: path.join(ROOT, 'runs', 'backend', 'rag_s1_metric_gate_summary.json'),
  };

  const advisoryBaselineFiles = {
    s1_2_benchmark: path.join(ROOT, 'runs', 'backend', 'rag_s1_2_benchmark_summary.json'),
    s1_2_decision: path.join(ROOT, 'runs', 'backend', 'rag_s1_2_decision_summary.json'),
  };

  const fixedArtifactPaths = {
    preflight: 'runs/backend/rag_s1_3_preflight.json',
    nodes_quality_audit: 'runs/backend/rag_curriculum_nodes_quality_audit.json',
    nodes_manual_sample: 'runs/backend/rag_curriculum_nodes_manual_samples.json',
    corpus_source_coverage: 'runs/backend/rag_corpus_source_coverage_summary.json',
    forced_retrieval_summary: 'runs/backend/rag_s1_3_forced_retrieval_summary.json',
    s2_go_no_go_decision: 'runs/backend/rag_s1_3_s2_go_no_go_decision.json',
    trust_report: 'docs/reports/rag_s1_3_data_source_trust_report.md',
    sampling_protocol: 'docs/reports/rag_curriculum_nodes_sampling_protocol.md',
    forced_retrieval_dataset: 'data/eval/rag_s1_3_forced_retrieval_v1.json',
    forced_retrieval_manifest: 'data/eval/rag_s1_3_forced_retrieval_v1_manifest.json',
  };

  const requiredGateSnapshot = {};
  for (const [key, filePath] of Object.entries(requiredGateFiles)) {
    const json = readJsonIfExists(filePath);
    requiredGateSnapshot[key] = {
      file: rel(filePath),
      exists: fs.existsSync(filePath),
      status:
        key === 's1_contract_gate'
          ? json?.all_green === true
            ? 'pass'
            : 'unknown_or_fail'
          : json?.status || 'missing',
      generated_at: json?.generated_at || null,
    };
  }

  const advisoryBaselineSnapshot = {};
  for (const [key, filePath] of Object.entries(advisoryBaselineFiles)) {
    const json = readJsonIfExists(filePath);
    advisoryBaselineSnapshot[key] = {
      file: rel(filePath),
      exists: fs.existsSync(filePath),
      status: json?.status || json?.decision || 'missing',
      benchmark_profile: json?.benchmark_profile || null,
      total_requests: json?.total_requests || null,
      generated_at: json?.generated_at || null,
    };
  }

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_s1_3_preflight',
    defaults_frozen: {
      retrieval_version: 'b_simplified_retrieval_s1_v1',
      required_gates_unchanged: [
        'S1 Contract Gate',
        'S1 Metric Gate (Required)',
      ],
    },
    required_gate_snapshot: requiredGateSnapshot,
    advisory_baseline_snapshot: advisoryBaselineSnapshot,
    fixed_artifact_paths: fixedArtifactPaths,
    checklist: {
      has_required_gate_baseline:
        requiredGateSnapshot.s1_contract_gate.exists &&
        requiredGateSnapshot.s1_metric_gate.exists,
      has_advisory_baseline:
        advisoryBaselineSnapshot.s1_2_benchmark.exists &&
        advisoryBaselineSnapshot.s1_2_decision.exists,
      artifact_paths_frozen: true,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
}

main();
