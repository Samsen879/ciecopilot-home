#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRagConfig } from '../../api/rag/lib/config.js';
import { classifyS2RouteByLlm } from '../../api/rag/lib/s2-llm-classifier.js';
import { classifyS2RouteByLocalModel } from '../../api/rag/lib/s2-local-classifier.js';
import { evaluateS2RouteByRules } from '../../api/rag/lib/s2-route-rules.js';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_c1_classifier_gate.json');
const SCRIPT_FILE = fileURLToPath(import.meta.url);

const REQUIRED_INPUTS = Object.freeze({
  preflight: 'runs/backend/rag_s2_preflight.json',
  route_classifier_model: 'runs/backend/rag_s2_route_classifier_model.json',
  route_classifier_eval: 'runs/backend/rag_s2_route_classifier_eval.json',
});

const ROUTE_TESTS = Object.freeze([
  'api/rag/__tests__/s2-route-rules.test.js',
  'api/rag/__tests__/s2-local-classifier.test.js',
  'api/rag/__tests__/s2-llm-classifier.test.js',
  'api/rag/__tests__/ask-service.test.js',
]);

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJsonIfExists(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function runJestCase(testPath) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', testPath, '--runInBand'],
    { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' },
  );
  return {
    test_path: testPath,
    ok: result.status === 0,
    exit_code: result.status ?? 1,
    stderr_tail: String(result.stderr || '').split('\n').slice(-20).join('\n'),
  };
}

function validateRouteDecision(decision) {
  if (!decision || typeof decision !== 'object') return false;
  const retrievalRoute = String(decision.retrieval_route || '');
  if (retrievalRoute !== 's1_default' && retrievalRoute !== 's2_augmentation') return false;
  if (!String(decision.route_reason || '').trim()) return false;
  if (!String(decision.route_stage || '').trim()) return false;
  return true;
}

async function runChecks() {
  const checks = [];

  const inputPresence = Object.fromEntries(
    Object.entries(REQUIRED_INPUTS).map(([name, relPath]) => [name, fs.existsSync(path.join(ROOT, relPath))]),
  );
  checks.push({
    id: 'inputs_present',
    ok: Object.values(inputPresence).every(Boolean),
    details: inputPresence,
  });

  const preflight = readJsonIfExists(REQUIRED_INPUTS.preflight);
  const model = readJsonIfExists(REQUIRED_INPUTS.route_classifier_model);
  const evalSummary = readJsonIfExists(REQUIRED_INPUTS.route_classifier_eval);

  checks.push({
    id: 'preflight_guardrails_locked',
    ok:
      preflight?.defaults_frozen?.s2_mode === 'augmentation_only' &&
      Number(preflight?.defaults_frozen?.s2_fallback_rate_gate_max) === 0.2,
    details: {
      s2_mode: preflight?.defaults_frozen?.s2_mode || null,
      s2_fallback_rate_gate_max: preflight?.defaults_frozen?.s2_fallback_rate_gate_max ?? null,
    },
  });

  checks.push({
    id: 'classifier_artifacts_valid',
    ok:
      model?.model_version === 's2_local_nb_v1' &&
      Number(model?.thresholds?.s2_min_prob) === 0.7 &&
      Number(model?.thresholds?.s1_max_prob) === 0.35 &&
      Number(evalSummary?.dataset_summary?.total_samples || 0) > 0,
    details: {
      model_version: model?.model_version || null,
      thresholds: model?.thresholds || null,
      dataset_total: evalSummary?.dataset_summary?.total_samples || 0,
      pseudo_labeled_bootstrap: Boolean(evalSummary?.dataset_summary?.pseudo_labeled_bootstrap),
    },
  });

  const rulePositive = evaluateS2RouteByRules('Create a cross-topic study plan across chapters with prerequisite chain.');
  const ruleNegative = evaluateS2RouteByRules('What is the definition in the current node only?');
  const ruleAmbiguous = evaluateS2RouteByRules('Can you explain this concept briefly?');
  checks.push({
    id: 'router_stable_output_labels',
    ok:
      validateRouteDecision(rulePositive) &&
      validateRouteDecision(ruleNegative) &&
      validateRouteDecision(ruleAmbiguous) &&
      rulePositive.retrieval_route === 's2_augmentation' &&
      ruleNegative.retrieval_route === 's1_default' &&
      ruleAmbiguous.retrieval_route === 's1_default',
    details: {
      positive: {
        retrieval_route: rulePositive.retrieval_route,
        route_reason: rulePositive.route_reason,
        route_stage: rulePositive.route_stage,
      },
      negative: {
        retrieval_route: ruleNegative.retrieval_route,
        route_reason: ruleNegative.route_reason,
        route_stage: ruleNegative.route_stage,
      },
      ambiguous: {
        retrieval_route: ruleAmbiguous.retrieval_route,
        route_reason: ruleAmbiguous.route_reason,
        route_stage: ruleAmbiguous.route_stage,
      },
    },
  });

  const localAmbiguous = classifyS2RouteByLocalModel('Explain concept relation', {
    model: {
      model_version: 'c1_ambiguous_probe',
      prior_log_odds: 0,
      token_log_odds: {},
      thresholds: {
        s2_min_prob: 0.7,
        s1_max_prob: 0.35,
      },
    },
  });
  checks.push({
    id: 'ambiguous_defaults_to_s1',
    ok:
      validateRouteDecision(localAmbiguous) &&
      localAmbiguous.retrieval_route === 's1_default' &&
      localAmbiguous.route_reason === 'local_classifier_ambiguous_default_s1',
    details: {
      retrieval_route: localAmbiguous.retrieval_route,
      route_reason: localAmbiguous.route_reason,
      p_s2: localAmbiguous?.route_scores?.p_s2 ?? null,
    },
  });

  let llmFetchCalled = false;
  const llmDisabledByConfig = await classifyS2RouteByLlm('cross topic relation planning?', {
    s2Config: {
      llmClassifierEnabled: true,
      llmClassifierBaseUrl: '',
      llmClassifierApiKey: null,
      llmClassifierModel: 'qwen-plus',
      llmClassifierTimeoutMs: 500,
    },
    fetchImpl: async () => {
      llmFetchCalled = true;
      throw new Error('fetch should not be called when llm classifier is not configured');
    },
  });
  checks.push({
    id: 'openai_not_required_for_router',
    ok:
      llmDisabledByConfig.available === false &&
      llmDisabledByConfig.retrieval_route === 's1_default' &&
      llmDisabledByConfig.route_reason === 'llm_classifier_not_configured_default_s1' &&
      llmFetchCalled === false,
    details: {
      route_reason: llmDisabledByConfig.route_reason,
      llm_classifier_status: llmDisabledByConfig.llm_classifier_status,
      llm_fetch_called: llmFetchCalled,
    },
  });

  const resolvedConfig = getRagConfig();
  checks.push({
    id: 'config_load_without_forced_openai',
    ok: resolvedConfig?.s2?.enabled === false && resolvedConfig?.s2?.llmClassifierEnabled === false,
    details: {
      s2_enabled_default: resolvedConfig?.s2?.enabled ?? null,
      s2_llm_classifier_enabled_default: resolvedConfig?.s2?.llmClassifierEnabled ?? null,
      s2_route_classifier_model_path: resolvedConfig?.s2?.routeClassifierModelPath || null,
    },
  });

  const routeTests = ROUTE_TESTS.map(runJestCase);
  checks.push({
    id: 'route_test_suite_green',
    ok: routeTests.every((item) => item.ok),
    details: {
      tests: routeTests.map((item) => ({
        test_path: item.test_path,
        ok: item.ok,
        exit_code: item.exit_code,
      })),
    },
    diagnostics: routeTests.filter((item) => !item.ok).map((item) => ({
      test_path: item.test_path,
      stderr_tail: item.stderr_tail,
    })),
  });

  return checks;
}

async function main() {
  const checks = await runChecks();
  const blocked = [];
  if (!checks.find((item) => item.id === 'router_stable_output_labels')?.ok) {
    blocked.push('router_not_stable_output');
  }
  if (!checks.find((item) => item.id === 'ambiguous_defaults_to_s1')?.ok) {
    blocked.push('ambiguous_not_default_to_s1');
  }
  if (!checks.find((item) => item.id === 'openai_not_required_for_router')?.ok) {
    blocked.push('openai_forced_dependency_detected');
  }
  if (!checks.find((item) => item.id === 'route_test_suite_green')?.ok) {
    blocked.push('route_test_suite_failed');
  }
  if (!checks.find((item) => item.id === 'inputs_present')?.ok) {
    blocked.push('required_inputs_missing');
  }

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_checkpoint_c1',
    run_config: {
      script: toRel(SCRIPT_FILE),
      required_inputs: REQUIRED_INPUTS,
      route_tests: ROUTE_TESTS,
    },
    inputs: Object.fromEntries(
      Object.entries(REQUIRED_INPUTS).map(([name, relPath]) => [
        name,
        {
          path: relPath,
          exists: fs.existsSync(path.join(ROOT, relPath)),
        },
      ]),
    ),
    checks,
    status: blocked.length === 0 ? 'pass' : 'fail',
    blocked_reasons: blocked,
    gate: {
      checkpoint: 'C1',
      self_check_passed: blocked.length === 0,
      requires_user_confirmation: true,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${toRel(OUT_FILE)}\n`);

  if (payload.status !== 'pass') {
    process.exit(1);
  }
}

main();
