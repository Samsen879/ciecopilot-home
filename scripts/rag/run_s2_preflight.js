#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { RETRIEVAL_VERSION } from '../../api/rag/lib/constants.js';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_preflight.json');

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readJsonIfExists(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const baselineFiles = {
    s1_contract_gate: 'runs/backend/rag_s1_contract_gate_summary.json',
    s1_metric_gate: 'runs/backend/rag_s1_metric_gate_summary.json',
    s1_3_s2_go_no_go_decision: 'runs/backend/rag_s1_3_s2_go_no_go_decision.json',
  };

  const s1Contract = readJsonIfExists(baselineFiles.s1_contract_gate);
  const s1Metric = readJsonIfExists(baselineFiles.s1_metric_gate);
  const s13Decision = readJsonIfExists(baselineFiles.s1_3_s2_go_no_go_decision);

  const fixedArtifactPaths = {
    preflight: 'runs/backend/rag_s2_preflight.json',
    dataset: 'data/eval/rag_s2_augmentation_eval_v1.json',
    manifest: 'data/eval/rag_s2_augmentation_eval_v1_manifest.json',
    route_classifier_model: 'runs/backend/rag_s2_route_classifier_model.json',
    route_classifier_eval: 'runs/backend/rag_s2_route_classifier_eval.json',
    readiness_profile: 'runs/backend/rag_s2_readiness_profile.json',
    eval_summary: 'runs/backend/rag_s2_augmentation_eval_summary.json',
    eval_report: 'docs/reports/rag_s2_augmentation_eval_report.md',
    advisory_gate_summary: 'runs/backend/rag_s2_advisory_gate_summary.json',
    release_decision: 'runs/backend/rag_s2_release_decision.json',
    route_share_ramp_experiment: 'runs/backend/rag_s2_route_share_ramp_experiment.json',
    requirements: 'codex-spec-mode/rag-s2-augmentation-routing-and-evaluation/requirements.md',
    design: 'codex-spec-mode/rag-s2-augmentation-routing-and-evaluation/design.md',
    tasks: 'codex-spec-mode/rag-s2-augmentation-routing-and-evaluation/tasks.md',
  };

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_preflight',
    defaults_frozen: {
      retrieval_version: RETRIEVAL_VERSION,
      s2_mode: 'augmentation_only',
      s2_v1_strategy: 'multi_hop_retrieval_with_prereq_expansion',
      s2_fallback_rate_gate_max: 0.2,
      required_gates_unchanged: [
        'S1 Contract Gate',
        'S1 Metric Gate (Required)',
      ],
    },
    baseline_snapshots: {
      s1_contract_gate: {
        path: baselineFiles.s1_contract_gate,
        exists: exists(baselineFiles.s1_contract_gate),
        all_green: s1Contract?.all_green === true,
        status: s1Contract?.all_green === true ? 'pass' : 'unknown_or_fail',
        generated_at: s1Contract?.generated_at || null,
      },
      s1_metric_gate: {
        path: baselineFiles.s1_metric_gate,
        exists: exists(baselineFiles.s1_metric_gate),
        status: s1Metric?.status || 'missing',
        gate_mode: s1Metric?.gate_mode || null,
        benchmark_profile: s1Metric?.benchmark_profile || null,
        generated_at: s1Metric?.generated_at || null,
      },
      s1_3_s2_go_no_go_decision: {
        path: baselineFiles.s1_3_s2_go_no_go_decision,
        exists: exists(baselineFiles.s1_3_s2_go_no_go_decision),
        decision: s13Decision?.decision || null,
        all_hard_gates_passed: Boolean(s13Decision?.all_hard_gates_passed),
        principal_failure_domain: s13Decision?.principal_failure_domain || null,
        generated_at: s13Decision?.generated_at || null,
      },
    },
    fixed_artifact_paths: fixedArtifactPaths,
    guardrails: {
      openai_api_key_must_not_be_required: true,
      frontend_integration_out_of_scope: true,
      migration_sql_change_out_of_scope: true,
    },
    checklist: {
      has_required_gate_baseline:
        exists(baselineFiles.s1_contract_gate) &&
        exists(baselineFiles.s1_metric_gate),
      has_s1_3_go_no_go_baseline: exists(baselineFiles.s1_3_s2_go_no_go_decision),
      s1_contract_gate_green: s1Contract?.all_green === true,
      s1_metric_gate_pass: s1Metric?.status === 'pass',
      s1_3_go_candidate: s13Decision?.decision === 'go_s2_candidate',
      artifact_paths_frozen: true,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
}

main();
