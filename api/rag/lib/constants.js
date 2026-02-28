export const BOUNDARY_ERROR_CODES = Object.freeze({
  TOPIC_PATH_MISSING: 'TOPIC_PATH_MISSING',
  TOPIC_PATH_NOT_FOUND: 'TOPIC_PATH_NOT_FOUND',
  TOPIC_PATH_FORBIDDEN: 'TOPIC_PATH_FORBIDDEN',
});

export const UNCERTAIN_REASON_CODES = Object.freeze({
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  CONFLICTING_EVIDENCE: 'CONFLICTING_EVIDENCE',
  TOPIC_LEAKAGE_BLOCKED: 'TOPIC_LEAKAGE_BLOCKED',
  RETRIEVER_ERROR: 'RETRIEVER_ERROR',
  QUERY_OUT_OF_SCOPE: 'QUERY_OUT_OF_SCOPE',
});

export const TOPIC_LEAKAGE_REASON_CODES = Object.freeze({
  CLIENT_INJECTED_PATH: 'CLIENT_INJECTED_PATH',
  RPC_BUG: 'RPC_BUG',
  APP_LAYER_BUG: 'APP_LAYER_BUG',
  DATA_BAD_TOPIC_PATH: 'DATA_BAD_TOPIC_PATH',
  ROUTER_BUG: 'ROUTER_BUG',
});

export const DEFAULT_RETRIEVAL_CONFIG = Object.freeze({
  k_key: 30,
  k_sem: 30,
  rrf_k: 60,
  fused_top_k: 8,
  w_key: 0.7,
  w_sem: 0.3,
});

export const S1_METRIC_THRESHOLDS = Object.freeze({
  topic_leakage_rate_max: 0.01,
  answer_correctness_f1_min: 0.85,
  evidence_traceability_rate_min: 0.95,
  latency_p95_ms_max: 3500,
  cost_avg_usd_per_req_max: 0.02,
});

export const RETRIEVAL_VERSION = 'b_simplified_retrieval_s1_v1';

export const FUNCTION_WHITELIST = Object.freeze(['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'sqrt']);
export const GREEK_WHITELIST = Object.freeze(['alpha', 'beta', 'gamma', 'theta', 'lambda', 'mu', 'sigma', 'omega']);

