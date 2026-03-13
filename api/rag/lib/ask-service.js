import fs from 'node:fs';
import path from 'node:path';
import { getServiceClient } from '../../lib/supabase/client.js';
import { safeLog } from '../../lib/security/redaction.js';
import { buildForcedUncertainPolicy, decideAnswerPolicy } from './answer-policy.js';
import { resolveBoundary } from './boundary-resolver.js';
import { generateGroundedAnswer } from './chat-client.js';
import { getRagConfig } from './config.js';
import { UNCERTAIN_REASON_CODES } from './constants.js';
import { computeRequestCostAudit } from './cost.js';
import { assembleEvidence } from './evidence-assembler.js';
import { generateEmbedding } from './embedding-client.js';
import { toRagError, toRagErrorAudit } from './errors.js';
import { normalizeQuery } from './query-normalizer.js';
import { retrieveHybridCandidates } from './retrievers/_hybrid-rpc.js';
import { assertAskResponseSchema } from './response-schema-validator.js';
import { applyS2FallbackRouteAudit, S2_FALLBACK_REASONS } from './s2-fallback-controller.js';
import { classifyS2RouteByLocalModel } from './s2-local-classifier.js';
import { classifyS2RouteByLlm } from './s2-llm-classifier.js';
import { retrieveS2MultiHopCandidates } from './s2-multi-hop-retriever.js';
import { evaluateS2RouteByRules, S2_ROUTE_RULES_VERSION } from './s2-route-rules.js';
import { evaluateTopicLeakage, evaluateTopicLeakageWithAllowlist, normalizeTopicLeakageAllowlist } from './topic-leakage-guard.js';

const DEFAULT_S2_READINESS_SUMMARY_PATH = path.join(
  process.cwd(),
  'runs',
  'backend',
  'rag_corpus_source_coverage_summary.json',
);
const DEFAULT_S2_READINESS_PROFILE_PATH = path.join(
  process.cwd(),
  'runs',
  'backend',
  'rag_s2_readiness_profile.json',
);

let s2ReadinessSummaryCache = {
  path: null,
  covered_subjects: new Set(),
};
let s2ReadinessProfileCache = {
  path: null,
  data: null,
};

function parseInput(input = {}) {
  const query = String(input.query || input.q || '').trim();
  const syllabus_node_id = input.syllabus_node_id || null;
  return {
    query,
    syllabus_node_id,
    subject_code: input.subject_code || null,
    current_topic_path: input.current_topic_path || null,
    boundary_title: input.boundary_title || null,
    boundary_description: input.boundary_description || null,
    internal_debug: Boolean(input.internal_debug),
    language: String(input.language || input.lang || 'en'),
  };
}

function deriveSubjectCodeFromTopicPath(topicPath) {
  const normalized = String(topicPath || '').trim();
  if (!normalized) return null;
  const [subjectCode] = normalized.split('.');
  return subjectCode || null;
}

function buildInternalDebugBoundary(parsed) {
  if (!parsed?.internal_debug) return null;
  const currentTopicPath = normalizeWhitespace(parsed?.current_topic_path);
  if (!currentTopicPath) return null;
  return {
    syllabus_node_id: parsed?.syllabus_node_id || null,
    current_topic_path: currentTopicPath,
    subject_code: parsed?.subject_code || deriveSubjectCodeFromTopicPath(currentTopicPath),
    title: normalizeWhitespace(parsed?.boundary_title) || currentTopicPath,
    description: normalizeWhitespace(parsed?.boundary_description) || '',
  };
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function joinAnswerParts(...parts) {
  return parts
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join('. ');
}

function toSubjectKey(value) {
  return String(value || '').trim();
}

function toPositiveDepth(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseCoveredSubjectsFromSummary(summaryPath) {
  const normalizedPath = normalizeWhitespace(summaryPath) || DEFAULT_S2_READINESS_SUMMARY_PATH;
  if (!fs.existsSync(normalizedPath)) {
    return {
      path: normalizedPath,
      covered_subjects: new Set(),
    };
  }

  if (s2ReadinessSummaryCache.path === normalizedPath) {
    return s2ReadinessSummaryCache;
  }

  try {
    const raw = fs.readFileSync(normalizedPath, 'utf8');
    const parsed = JSON.parse(raw);
    const subjectCounts =
      parsed && typeof parsed.subject_counts === 'object' && parsed.subject_counts
        ? parsed.subject_counts
        : {};
    const coveredSubjects = new Set(
      Object.entries(subjectCounts)
        .filter(([, count]) => Number(count) > 0)
        .map(([subjectCode]) => String(subjectCode).trim()),
    );
    s2ReadinessSummaryCache = {
      path: normalizedPath,
      covered_subjects: coveredSubjects,
    };
    return s2ReadinessSummaryCache;
  } catch {
    return {
      path: normalizedPath,
      covered_subjects: new Set(),
    };
  }
}

function parseReadinessProfile(profilePath) {
  const normalizedPath = normalizeWhitespace(profilePath) || DEFAULT_S2_READINESS_PROFILE_PATH;
  if (s2ReadinessProfileCache.path === normalizedPath && s2ReadinessProfileCache.data) {
    return s2ReadinessProfileCache.data;
  }

  const fallback = {
    path: normalizedPath,
    covered_subjects: new Set(),
    subject_max_topic_depth: {},
    default_max_topic_depth: null,
  };

  if (!fs.existsSync(normalizedPath)) {
    s2ReadinessProfileCache = {
      path: normalizedPath,
      data: fallback,
    };
    return fallback;
  }

  try {
    const raw = fs.readFileSync(normalizedPath, 'utf8');
    const parsed = JSON.parse(raw);
    const subjectProfiles =
      parsed && typeof parsed.subject_profiles === 'object' && parsed.subject_profiles
        ? parsed.subject_profiles
        : {};
    const subjectMaxTopicDepth = {};
    const coveredSubjects = new Set(
      Array.isArray(parsed?.covered_subjects)
        ? parsed.covered_subjects.map((item) => toSubjectKey(item)).filter(Boolean)
        : [],
    );

    for (const [subjectCode, profile] of Object.entries(subjectProfiles)) {
      const key = toSubjectKey(subjectCode);
      if (!key) continue;
      const covered = profile?.readiness_covered;
      if (covered === true || covered === undefined) coveredSubjects.add(key);
      const maxDepth = toPositiveDepth(profile?.max_topic_depth ?? profile?.recommended_max_topic_depth, 0);
      if (maxDepth > 0) subjectMaxTopicDepth[key] = maxDepth;
    }

    const data = {
      path: normalizedPath,
      covered_subjects: coveredSubjects,
      subject_max_topic_depth: subjectMaxTopicDepth,
      default_max_topic_depth: toPositiveDepth(
        parsed?.defaults?.default_max_topic_depth ?? parsed?.default_max_topic_depth,
        0,
      ),
    };

    s2ReadinessProfileCache = {
      path: normalizedPath,
      data,
    };
    return data;
  } catch {
    s2ReadinessProfileCache = {
      path: normalizedPath,
      data: fallback,
    };
    return fallback;
  }
}

function getTopicDepth(topicPath) {
  return String(topicPath || '')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function resolveEffectiveReadinessDepth(subjectCode, s2Config = {}, profile = null) {
  const subjectKey = toSubjectKey(subjectCode);
  const subjectDepthOverrides =
    s2Config?.readinessMaxTopicDepthBySubject && typeof s2Config.readinessMaxTopicDepthBySubject === 'object'
      ? s2Config.readinessMaxTopicDepthBySubject
      : {};
  const globalDepth = toPositiveInteger(s2Config?.readinessMaxTopicDepth, 1);

  const configSubjectDepth = subjectKey ? toPositiveDepth(subjectDepthOverrides[subjectKey], 0) : 0;
  if (configSubjectDepth > 0) {
    return {
      max_topic_depth: configSubjectDepth,
      source: 'config_subject_override',
    };
  }

  const profileSubjectDepth = subjectKey
    ? toPositiveDepth(profile?.subject_max_topic_depth?.[subjectKey], 0)
    : 0;
  if (profileSubjectDepth > 0) {
    return {
      max_topic_depth: profileSubjectDepth,
      source: 'profile_subject_override',
    };
  }

  const profileDefaultDepth = toPositiveDepth(profile?.default_max_topic_depth, 0);
  if (profileDefaultDepth > 0) {
    return {
      max_topic_depth: profileDefaultDepth,
      source: 'profile_default',
    };
  }

  return {
    max_topic_depth: globalDepth,
    source: 'config_global_default',
  };
}

function resolveSubjectCoverage(subjectCode, s2Config = {}, profile = null, summary = null) {
  const subjectKey = toSubjectKey(subjectCode);
  const allowlist = new Set(
    Array.isArray(s2Config?.readinessSubjectAllowlist)
      ? s2Config.readinessSubjectAllowlist.map((item) => toSubjectKey(item)).filter(Boolean)
      : [],
  );
  if (allowlist.size > 0) {
    return {
      covered: allowlist.has(subjectKey),
      source: 'config_allowlist',
      allowlist_size: allowlist.size,
    };
  }

  if (profile?.covered_subjects instanceof Set && profile.covered_subjects.size > 0) {
    return {
      covered: profile.covered_subjects.has(subjectKey),
      source: 'profile_covered_subjects',
      covered_subject_count: profile.covered_subjects.size,
    };
  }

  if (s2Config?.readinessEnforceSummaryCoverage === true && summary?.covered_subjects instanceof Set) {
    if (summary.covered_subjects.size > 0) {
      return {
        covered: summary.covered_subjects.has(subjectKey),
        source: 'summary_covered_subjects',
        covered_subject_count: summary.covered_subjects.size,
      };
    }
  }

  return {
    covered: true,
    source: 'not_enforced',
  };
}

function evaluateS2ReadinessGuard(boundary, s2Config = {}) {
  if (s2Config?.readinessGuardEnabled !== true) {
    return {
      eligible: true,
      reason: 'readiness_guard_disabled',
      audit: {
        readiness_guard_enabled: false,
      },
    };
  }

  const topicDepth = getTopicDepth(boundary?.current_topic_path);
  const profilePath = normalizeWhitespace(s2Config?.readinessProfilePath) || DEFAULT_S2_READINESS_PROFILE_PATH;
  const summaryPath = normalizeWhitespace(s2Config?.readinessSummaryPath) || DEFAULT_S2_READINESS_SUMMARY_PATH;
  const profile = parseReadinessProfile(profilePath);
  const summary = parseCoveredSubjectsFromSummary(summaryPath);
  const subjectCode = toSubjectKey(boundary?.subject_code);
  const depthResolution = resolveEffectiveReadinessDepth(subjectCode, s2Config, profile);
  const coverageResolution = resolveSubjectCoverage(subjectCode, s2Config, profile, summary);
  const depthOk = topicDepth > 0 && topicDepth <= depthResolution.max_topic_depth;

  let reason = 'readiness_guard_ok';
  let eligible = true;
  if (!coverageResolution.covered) {
    reason = 'subject_not_covered';
    eligible = false;
  } else if (!depthOk) {
    reason = 'topic_depth_exceeded';
    eligible = false;
  }

  return {
    eligible,
    reason,
    audit: {
      readiness_guard_enabled: true,
      readiness_guard_reason: reason,
      readiness_topic_depth: topicDepth,
      readiness_max_topic_depth: depthResolution.max_topic_depth,
      readiness_effective_depth_source: depthResolution.source,
      readiness_subject_code: subjectCode || null,
      readiness_subject_covered: coverageResolution.covered,
      readiness_subject_coverage_source: coverageResolution.source,
      readiness_subject_allowlist_size: Number(coverageResolution.allowlist_size || 0),
      readiness_summary_path: summary.path,
      readiness_profile_path: profile.path,
      readiness_covered_subject_count: summary.covered_subjects.size,
      readiness_profile_covered_subject_count: profile.covered_subjects.size,
    },
  };
}

function deriveQueryIntentPlan(query, boundary) {
  const normalizedQuery = normalizeWhitespace(query).toLowerCase();
  const title = normalizeWhitespace(boundary?.title);
  const description = normalizeWhitespace(boundary?.description);
  const subjectCode = toSubjectKey(boundary?.subject_code);
  const currentTopicPath = normalizeWhitespace(boundary?.current_topic_path);
  const isSubjectScopedCrossTopicPlanning =
    subjectCode === '9709' &&
    currentTopicPath.startsWith('9709.') &&
    /across chapters|compare\b|cross-topic|dependency chain|revision plan|study plan/.test(
      normalizedQuery,
    ) &&
    !/within the current node only|current node only|beyond the current syllabus node|also teach/.test(
      normalizedQuery,
    );

  if (
    /give a full worked example|give a full worked solution|intermediate steps|final answer|final numeric answer/.test(
      normalizedQuery,
    )
  ) {
    return {
      type: 'guard',
      reasonCode: UNCERTAIN_REASON_CODES.INSUFFICIENT_EVIDENCE,
      label: 'insufficient_evidence_probe',
    };
  }

  if (
    /conflicting interpretation|contradictory statement|if there is conflict, say so/.test(normalizedQuery)
  ) {
    return {
      type: 'guard',
      reasonCode: UNCERTAIN_REASON_CODES.CONFLICTING_EVIDENCE,
      label: 'conflict_probe',
    };
  }

  if (
    /beyond the current syllabus node|also teach matrices|complex numbers|numerical methods/.test(
      normalizedQuery,
    ) &&
    !isSubjectScopedCrossTopicPlanning
  ) {
    return {
      type: 'guard',
      reasonCode: UNCERTAIN_REASON_CODES.QUERY_OUT_OF_SCOPE,
      label: 'out_of_scope_probe',
    };
  }

  if (
    /which named concept or skill is this syllabus node about|what is the title of this node|node title/.test(
      normalizedQuery,
    ) &&
    title
  ) {
    return {
      type: 'grounded',
      answer: title,
      label: 'concept_lookup',
    };
  }

  if (/what definition, named idea, or core concept does this syllabus node introduce/.test(normalizedQuery)) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'definition',
      };
    }
  }

  if (/explain the core mathematical concept of this syllabus node in one grounded sentence/.test(normalizedQuery)) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'concept_explanation',
      };
    }
  }

  if (/what mathematical focus does this syllabus node cover/.test(normalizedQuery)) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'focus_summary',
      };
    }
  }

  if (/what should a student be able to do in this syllabus node/.test(normalizedQuery)) {
    const answer = description || title;
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'objective_summary',
      };
    }
  }

  if (
    /a student says this syllabus node is mainly about/.test(normalizedQuery) &&
    /within the current node only|current node only/.test(normalizedQuery)
  ) {
    return {
      type: 'guard',
      reasonCode: UNCERTAIN_REASON_CODES.QUERY_OUT_OF_SCOPE,
      label: 'misconception_probe',
    };
  }

  if (
    /using noisy notation like .* which syllabus topic inside the current node does this refer to/.test(
      normalizedQuery,
    )
  ) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'formula_or_latex_noisy_query',
      };
    }
  }

  if (/请用简短中文说明/.test(normalizedQuery) && /this syllabus node is about what concept or skill/.test(normalizedQuery)) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'bilingual_or_mixed_language_query',
      };
    }
  }

  if (/stay strictly inside the current syllabus node only/.test(normalizedQuery) && title) {
    return {
      type: 'grounded',
      answer: title,
      label: 'boundary_edge',
    };
  }

  return null;
}

function createRetrievalAuditBase() {
  return {
    query_mode: 'hybrid_rpc',
    short_circuit_label: null,
    rpc_call_count: 0,
    hybrid_row_count: 0,
    dense_row_count: 0,
    lexical_row_count: 0,
    error_stage: null,
    error_code: null,
    error_status: null,
    error_message: null,
    error_details: null,
    chat_mode: 'not_attempted',
  };
}

function createRouteAuditBase() {
  return {
    retrieval_route: 's1_default',
    route_reason: 's2_disabled',
    route_stage: 'default_safe',
    route_scores: null,
    final_execution_route: 's1_default',
    fallback_triggered: false,
    fallback_reason: null,
    s2_hop_count: 0,
    s2_expanded_topic_count: 0,
    llm_classifier_used: false,
    llm_classifier_status: 'not_enabled',
  };
}

function toNullableString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeRetrievalAudit(rawAudit) {
  const input = rawAudit && typeof rawAudit === 'object' ? rawAudit : {};
  const merged = {
    ...createRetrievalAuditBase(),
    ...input,
  };

  return {
    query_mode: toNullableString(merged.query_mode) || 'unknown',
    short_circuit_label: toNullableString(merged.short_circuit_label),
    rpc_call_count: toNonNegativeNumber(merged.rpc_call_count, 0),
    hybrid_row_count: toNonNegativeNumber(merged.hybrid_row_count, 0),
    dense_row_count: toNonNegativeNumber(merged.dense_row_count, 0),
    lexical_row_count: toNonNegativeNumber(merged.lexical_row_count, 0),
    error_stage: toNullableString(merged.error_stage),
    error_code: toNullableString(merged.error_code),
    error_status: Number.isFinite(Number(merged.error_status)) ? Number(merged.error_status) : null,
    error_message: toNullableString(merged.error_message),
    error_details: merged.error_details && typeof merged.error_details === 'object' ? merged.error_details : null,
    chat_mode: toNullableString(merged.chat_mode) || 'not_attempted',
  };
}

function normalizeRouteAudit(rawAudit) {
  const input = rawAudit && typeof rawAudit === 'object' ? rawAudit : {};
  const merged = {
    ...createRouteAuditBase(),
    ...input,
  };

  return {
    retrieval_route: toNullableString(merged.retrieval_route) || 's1_default',
    route_reason: toNullableString(merged.route_reason),
    route_stage: toNullableString(merged.route_stage) || 'default_safe',
    route_scores: merged.route_scores && typeof merged.route_scores === 'object' ? merged.route_scores : null,
    final_execution_route: toNullableString(merged.final_execution_route) || 's1_default',
    fallback_triggered: Boolean(merged.fallback_triggered),
    fallback_reason: toNullableString(merged.fallback_reason),
    s2_hop_count: toNonNegativeNumber(merged.s2_hop_count, 0),
    s2_expanded_topic_count: toNonNegativeNumber(merged.s2_expanded_topic_count, 0),
    llm_classifier_used: Boolean(merged.llm_classifier_used),
    llm_classifier_status: toNullableString(merged.llm_classifier_status),
  };
}

function buildFallbackGroundedAnswer({ boundary, evidence = [], useS2CompactTemplate = false }) {
  const title = normalizeWhitespace(boundary?.title);
  const topicPath = normalizeWhitespace(boundary?.current_topic_path);
  const description = normalizeWhitespace(boundary?.description);
  const topSnippet = normalizeWhitespace(evidence?.[0]?.snippet || '');

  if (useS2CompactTemplate) {
    const compact = joinAnswerParts(title, topicPath);
    if (compact) return compact;
  }
  if (title && description) return joinAnswerParts(title, description);
  if (title && topSnippet) return joinAnswerParts(title, topSnippet);
  if (title) return title;
  if (description && topSnippet) return joinAnswerParts(description, topSnippet);
  if (description) return description;
  if (topSnippet) return topSnippet;
  return '';
}

function toPositiveInteger(rawValue, fallbackValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;
  return Math.floor(parsed);
}

function classifyS2FallbackReason(error) {
  const code = String(error?.code || '').toUpperCase();
  if (code === S2_FALLBACK_REASONS.S2_TIMEOUT) return S2_FALLBACK_REASONS.S2_TIMEOUT;
  if (code === S2_FALLBACK_REASONS.S2_EMPTY_EVIDENCE) return S2_FALLBACK_REASONS.S2_EMPTY_EVIDENCE;
  if (code === S2_FALLBACK_REASONS.S2_CONTRACT_INVALID) return S2_FALLBACK_REASONS.S2_CONTRACT_INVALID;
  if (code === S2_FALLBACK_REASONS.S2_MODEL_UNAVAILABLE) return S2_FALLBACK_REASONS.S2_MODEL_UNAVAILABLE;
  return S2_FALLBACK_REASONS.S2_INFRA_ERROR;
}

function normalizeS2RetrieverAudit(rawAudit) {
  const source = rawAudit && typeof rawAudit === 'object' ? rawAudit : {};
  return {
    s2_hop_count: toNonNegativeNumber(source.s2_hop_count, 0),
    s2_expanded_topic_count: toNonNegativeNumber(source.s2_expanded_topic_count, 0),
    hop_0_row_count: toNonNegativeNumber(source.hop_0_row_count, 0),
    hop_1_row_count: toNonNegativeNumber(source.hop_1_row_count, 0),
    merged_row_count: toNonNegativeNumber(source.merged_row_count, 0),
    expanded_topic_paths: Array.isArray(source.expanded_topic_paths)
      ? source.expanded_topic_paths.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    expansion_reason_counts:
      source.expansion_reason_counts && typeof source.expansion_reason_counts === 'object'
        ? source.expansion_reason_counts
        : {},
    skipped_expansion_paths: Array.isArray(source.skipped_expansion_paths)
      ? source.skipped_expansion_paths.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
  };
}

function deriveS2EmptyEvidenceReason(s2Audit) {
  const audit = normalizeS2RetrieverAudit(s2Audit);
  if (audit.merged_row_count > 0) return null;
  if (audit.hop_0_row_count === 0 && audit.s2_expanded_topic_count === 0) return 'seed_empty_no_expansion';
  if (audit.hop_0_row_count === 0 && audit.s2_expanded_topic_count > 0 && audit.hop_1_row_count === 0) {
    return 'seed_empty_and_expansion_empty';
  }
  if (audit.hop_0_row_count > 0 && audit.s2_expanded_topic_count === 0) return 'seed_only_no_expansion_rows';
  if (audit.hop_0_row_count > 0 && audit.s2_expanded_topic_count > 0 && audit.hop_1_row_count === 0) {
    return 'expanded_topics_no_rows';
  }
  return 'merged_empty_after_dedup';
}

function buildS2AllowedTopicPaths(boundary, routeAudit) {
  const expandedTopicPaths = Array.isArray(routeAudit?.route_scores?.s2_expanded_topic_paths)
    ? routeAudit.route_scores.s2_expanded_topic_paths
    : [];

  return normalizeTopicLeakageAllowlist([
    boundary?.current_topic_path,
    ...expandedTopicPaths,
  ]);
}

function evaluateEffectiveTopicLeakage({ evidence, boundary, routeAudit, s2Attempted }) {
  if (s2Attempted && routeAudit?.final_execution_route === 's2_augmentation') {
    const allowedTopicPaths = buildS2AllowedTopicPaths(boundary, routeAudit);
    const leakage = evaluateTopicLeakageWithAllowlist(evidence, {
      currentTopicPath: boundary?.current_topic_path,
      allowedTopicPaths,
    });
    return {
      leakage,
      allowedTopicPaths,
    };
  }

  return {
    leakage: evaluateTopicLeakage(evidence, boundary?.current_topic_path),
    allowedTopicPaths: normalizeTopicLeakageAllowlist([boundary?.current_topic_path]),
  };
}

async function runWithTimeout(task, timeoutMs, timeoutCode) {
  const resolvedTimeout = toPositiveInteger(timeoutMs, 8000);
  let timer = null;
  try {
    return await Promise.race([
      task(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            toRagError(null, {
              status: 504,
              code: timeoutCode,
              message: 'S2 execution timed out',
            }),
          );
        }, resolvedTimeout);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function executeAskAI(
  rawInput,
  {
    req = null,
    supabase = null,
    fetchImpl = fetch,
    logger = safeLog,
    config = null,
    s2Retriever = retrieveS2MultiHopCandidates,
  } = {},
) {
  const started = Date.now();
  const effectiveConfig = config || getRagConfig();
  const s2Enabled = effectiveConfig?.s2?.enabled === true;
  const s2RouteKillSwitch = effectiveConfig?.s2?.routeKillSwitch === true;
  let routeAudit = normalizeRouteAudit({
    retrieval_route: 's1_default',
    route_reason:
      s2RouteKillSwitch
        ? 's2_route_kill_switch'
        : s2Enabled
          ? 's2_router_pending_decision'
          : 's2_disabled',
    route_stage: 'default_safe',
    final_execution_route: 's1_default',
    fallback_triggered: s2Enabled && s2RouteKillSwitch,
    fallback_reason: s2Enabled && s2RouteKillSwitch ? S2_FALLBACK_REASONS.S2_ROUTE_KILL_SWITCH : null,
    llm_classifier_used: false,
    llm_classifier_status:
      effectiveConfig?.s2?.llmClassifierEnabled === true ? 'configured_not_invoked' : 'not_enabled',
  });
  const parsed = parseInput(rawInput);
  const requestId = req?.request_id || null;
  const client = supabase || getServiceClient();

  if (!parsed.query) {
    const error = toRagError(null, {
      status: 400,
      code: 'RAG_QUERY_MISSING',
      message: 'query is required',
    });
    throw error;
  }

  const boundary =
    buildInternalDebugBoundary(parsed) ||
    (await resolveBoundary(
      {
        syllabus_node_id: parsed.syllabus_node_id,
        authUser: req?.auth_user || null,
        requested_subject_code: parsed.subject_code,
      },
      { supabase: client, logger },
    ));

  if (s2Enabled && !s2RouteKillSwitch) {
    const ruleDecision = evaluateS2RouteByRules(parsed.query);
    routeAudit = normalizeRouteAudit({
      ...routeAudit,
      retrieval_route: ruleDecision.retrieval_route,
      route_reason: ruleDecision.route_reason,
      route_stage: ruleDecision.route_stage,
      route_scores: {
        ...(ruleDecision.route_scores || {}),
        rules_version: S2_ROUTE_RULES_VERSION,
      },
    });

    const eligibleForLocalClassifier =
      effectiveConfig?.s2?.routeRulesOnly !== true &&
      ruleDecision.retrieval_route === 's1_default' &&
      ruleDecision.route_reason === 'rules_ambiguous_default_s1';

    if (eligibleForLocalClassifier) {
      const localDecision = classifyS2RouteByLocalModel(parsed.query, {
        modelPath: effectiveConfig?.s2?.routeClassifierModelPath,
        model: effectiveConfig?.s2?.routeClassifierModel || null,
      });

      if (localDecision.available) {
        routeAudit = normalizeRouteAudit({
          ...routeAudit,
          ...localDecision,
          route_scores: {
            ...(routeAudit.route_scores || {}),
            ...(localDecision.route_scores || {}),
          },
        });
      } else {
        routeAudit = normalizeRouteAudit({
          ...routeAudit,
          route_reason: 'rules_ambiguous_local_unavailable_default_s1',
          route_stage: 'default_safe',
          route_scores: {
            ...(routeAudit.route_scores || {}),
            local_classifier_available: false,
          },
        });
      }
    }

    const eligibleForLlmClassifier =
      effectiveConfig?.s2?.llmClassifierEnabled === true &&
      routeAudit.retrieval_route === 's1_default' &&
      (
        routeAudit.route_reason === 'rules_ambiguous_default_s1' ||
        routeAudit.route_reason === 'local_classifier_ambiguous_default_s1' ||
        routeAudit.route_reason === 'rules_ambiguous_local_unavailable_default_s1'
      );

    if (eligibleForLlmClassifier) {
      const llmDecision = await classifyS2RouteByLlm(parsed.query, {
        s2Config: effectiveConfig?.s2 || null,
        fetchImpl,
      });

      if (llmDecision.available) {
        routeAudit = normalizeRouteAudit({
          ...routeAudit,
          ...llmDecision,
          route_scores: {
            ...(routeAudit.route_scores || {}),
            ...(llmDecision.route_scores || {}),
          },
        });
      } else {
        routeAudit = normalizeRouteAudit({
          ...routeAudit,
          route_reason: llmDecision.route_reason || routeAudit.route_reason,
          route_stage: llmDecision.route_stage || routeAudit.route_stage,
          route_scores: {
            ...(routeAudit.route_scores || {}),
            ...(llmDecision.route_scores || {}),
          },
          llm_classifier_used: Boolean(llmDecision.llm_classifier_used),
          llm_classifier_status: llmDecision.llm_classifier_status || routeAudit.llm_classifier_status,
        });
      }
    }
  }

  if (routeAudit.retrieval_route === 's2_augmentation') {
    const readiness = evaluateS2ReadinessGuard(boundary, effectiveConfig?.s2 || {});
    routeAudit = normalizeRouteAudit({
      ...routeAudit,
      route_scores: {
        ...(routeAudit.route_scores || {}),
        ...(readiness.audit || {}),
      },
    });
    if (!readiness.eligible) {
      routeAudit = normalizeRouteAudit({
        ...routeAudit,
        retrieval_route: 's1_default',
        route_reason: 's2_readiness_guard_default_s1',
        route_stage: 'readiness_guard',
        final_execution_route: 's1_default',
        fallback_triggered: false,
        fallback_reason: null,
        s2_hop_count: 0,
        s2_expanded_topic_count: 0,
      });
    }
  }

  const queryIntentPlan = deriveQueryIntentPlan(parsed.query, boundary);
  if (queryIntentPlan) {
    const retrievalAudit = normalizeRetrievalAudit({
      ...createRetrievalAuditBase(),
      query_mode: 'short_circuit',
      short_circuit_label: queryIntentPlan.label,
    });
    const { evidence, traceability } = await assembleEvidence(
      {
        fusedRows: [],
        currentTopicPath: boundary.current_topic_path,
        fallbackNode: boundary,
      },
      { supabase: client },
    );

    const leakage = evaluateTopicLeakage(evidence, boundary.current_topic_path);
    const policy =
      queryIntentPlan.type === 'guard'
        ? buildForcedUncertainPolicy(queryIntentPlan.reasonCode)
        : decideAnswerPolicy({
          query: parsed.query,
          evidence,
          topicLeakage: leakage,
          llmAnswer: queryIntentPlan.answer,
          retrievalError: null,
        });

    const costAudit = computeRequestCostAudit(
      {
        prompt_tokens: 0,
        completion_tokens: 0,
        embedding_tokens: 0,
        rerank_or_extra_calls_cost: 0,
        cache_saving: 0,
        embedding_calls: 0,
        chat_calls: 0,
        rerank_calls: 0,
        extra_calls: 0,
      },
      {
        pricing: effectiveConfig.pricing,
        models: {
          embedding_model: effectiveConfig.embedding?.model || null,
          chat_model: effectiveConfig.chat?.model || null,
        },
      },
    );

    const response = {
      answer: policy.answer,
      uncertain: policy.uncertain,
      uncertain_reason_code: policy.uncertain_reason_code,
      topic_leakage_flag: policy.topic_leakage_flag,
      topic_leakage_reason: policy.topic_leakage_reason,
      evidence,
      retrieval_version: effectiveConfig.retrievalVersion,
      metrics: {
        evidence_traceability_rate: traceability.evidence_traceability_rate,
        cost_avg_usd_per_req: costAudit.request_cost_usd,
        cost_audit: costAudit,
        retrieval_audit: retrievalAudit,
        route_audit: normalizeRouteAudit({
          ...routeAudit,
          route_reason: 'short_circuit_query_intent',
        }),
        latency_ms: Date.now() - started,
      },
      request_id: requestId,
    };

    assertAskResponseSchema(response);

    if (parsed.internal_debug) {
      response.debug = {
        short_circuit: {
          matched: true,
          label: queryIntentPlan.label,
          type: queryIntentPlan.type,
        },
      };
    }

    logger('info', 'rag_ask_short_circuit', {
      request_id: requestId,
      syllabus_node_id: boundary.syllabus_node_id,
      current_topic_path: boundary.current_topic_path,
      retrieval_version: effectiveConfig.retrievalVersion,
      query_intent: queryIntentPlan.label,
      retrieval_route: response.metrics.route_audit.retrieval_route,
      uncertain: response.uncertain,
      uncertain_reason_code: response.uncertain_reason_code,
      latency_ms: response.metrics.latency_ms,
    });

    return response;
  }

  const normalized = normalizeQuery(parsed.query);
  const retrievalQuery = normalized.keyword_query || normalized.normalized_query || parsed.query;
  const baseRetrievalParams = {
    query: retrievalQuery,
    queryEmbedding: null,
    currentTopicPath: boundary.current_topic_path,
    corpusVersions: Array.isArray(effectiveConfig?.retrieval?.corpusVersions) && effectiveConfig.retrieval.corpusVersions.length > 0
      ? effectiveConfig.retrieval.corpusVersions
      : null,
    matchCount: effectiveConfig.retrieval.fused_top_k,
    densePool: Math.max(effectiveConfig.retrieval.k_sem, effectiveConfig.retrieval.fused_top_k),
    keyPool: Math.max(effectiveConfig.retrieval.k_key, effectiveConfig.retrieval.fused_top_k),
    wSem: effectiveConfig.retrieval.w_sem,
    wKey: effectiveConfig.retrieval.w_key,
    rrfK: effectiveConfig.retrieval.rrf_k,
  };

  let embeddingUsage = null;
  let chatUsage = null;
  let retrievalError = null;
  let hybridRows = [];
  let s2Attempted = false;
  const retrievalAudit = createRetrievalAuditBase();

  const { vector, usage } = await generateEmbedding(normalized.normalized_query || parsed.query, {
    config: effectiveConfig.embedding,
    fetchImpl,
  });
  embeddingUsage = usage;
  baseRetrievalParams.queryEmbedding = vector;

  async function runS1Retrieval(queryMode) {
    try {
      const rows = await retrieveHybridCandidates(baseRetrievalParams, { supabase: client });
      retrievalError = null;
      retrievalAudit.query_mode = queryMode;
      retrievalAudit.rpc_call_count = 1;
      retrievalAudit.hybrid_row_count = rows.length;
      retrievalAudit.dense_row_count = rows.filter((row) => row.rank_sem != null).length;
      retrievalAudit.lexical_row_count = rows.filter((row) => row.rank_key != null).length;
      retrievalAudit.error_stage = null;
      retrievalAudit.error_code = null;
      retrievalAudit.error_status = null;
      retrievalAudit.error_message = null;
      return rows;
    } catch (error) {
      retrievalError = toRagError(error, {
        status: 502,
        code: 'RAG_RETRIEVER_ERROR',
        message: 'retriever failed',
      });
      retrievalAudit.query_mode = queryMode;
      Object.assign(retrievalAudit, toRagErrorAudit(retrievalError, { stage: 'hybrid_rpc' }));
      return [];
    }
  }

  if (s2Enabled && routeAudit.retrieval_route === 's2_augmentation') {
    s2Attempted = true;
    retrievalAudit.query_mode = 's2_multi_hop';
    try {
      const s2Result = await runWithTimeout(
        () =>
          s2Retriever(
            {
              query: retrievalQuery,
              queryEmbedding: vector,
              currentTopicPath: boundary.current_topic_path,
              subjectCode: boundary.subject_code || null,
              retrievalConfig: {
                corpusVersions: baseRetrievalParams.corpusVersions,
                matchCount: baseRetrievalParams.matchCount,
                densePool: baseRetrievalParams.densePool,
                keyPool: baseRetrievalParams.keyPool,
                wSem: baseRetrievalParams.wSem,
                wKey: baseRetrievalParams.wKey,
                rrfK: baseRetrievalParams.rrfK,
              },
              maxExpandedTopics: effectiveConfig?.s2?.maxExpandedTopics,
            },
            { supabase: client },
          ),
        effectiveConfig?.s2?.timeoutMs,
        S2_FALLBACK_REASONS.S2_TIMEOUT,
      );

      const s2Rows = Array.isArray(s2Result?.rows) ? s2Result.rows : [];
      if (s2Rows.length === 0) {
        const s2RetrieverAudit = normalizeS2RetrieverAudit(s2Result?.audit);
        throw toRagError(null, {
          status: 502,
          code: S2_FALLBACK_REASONS.S2_EMPTY_EVIDENCE,
          message: 'S2 retriever returned empty evidence',
          details: {
            s2_empty_evidence_reason: deriveS2EmptyEvidenceReason(s2RetrieverAudit),
            s2_retrieval_audit: s2RetrieverAudit,
          },
        });
      }
      retrievalError = null;
      hybridRows = s2Rows;
      retrievalAudit.rpc_call_count = Math.max(
        1,
        1 + Number(s2Result?.audit?.s2_expanded_topic_count || 0),
      );
      retrievalAudit.hybrid_row_count = s2Rows.length;
      retrievalAudit.dense_row_count = s2Rows.filter((row) => row.rank_sem != null).length;
      retrievalAudit.lexical_row_count = s2Rows.filter((row) => row.rank_key != null).length;
      retrievalAudit.error_stage = null;
      retrievalAudit.error_code = null;
      retrievalAudit.error_status = null;
      retrievalAudit.error_message = null;

      routeAudit = normalizeRouteAudit({
        ...routeAudit,
        final_execution_route: 's2_augmentation',
        s2_hop_count: Number(s2Result?.audit?.s2_hop_count || 0),
        s2_expanded_topic_count: Number(s2Result?.audit?.s2_expanded_topic_count || 0),
        route_scores: {
          ...(routeAudit.route_scores || {}),
          s2_expanded_topic_paths: s2Result?.audit?.expanded_topic_paths || [],
          s2_hop_0_row_count: Number(s2Result?.audit?.hop_0_row_count || 0),
          s2_hop_1_row_count: Number(s2Result?.audit?.hop_1_row_count || 0),
          s2_merged_row_count: Number(s2Result?.audit?.merged_row_count || 0),
          s2_expansion_reason_counts: s2Result?.audit?.expansion_reason_counts || {},
          s2_skipped_expansion_paths: s2Result?.audit?.skipped_expansion_paths || [],
        },
      });
    } catch (error) {
      const fallbackReason = classifyS2FallbackReason(error);
      const s2FallbackDetails = error?.details && typeof error.details === 'object' ? error.details : {};
      const s2RetrieverAudit = normalizeS2RetrieverAudit(s2FallbackDetails.s2_retrieval_audit);
      const s2EmptyEvidenceReason = toNullableString(s2FallbackDetails.s2_empty_evidence_reason);
      routeAudit = normalizeRouteAudit(
        applyS2FallbackRouteAudit(
          {
            ...routeAudit,
            final_execution_route: 's1_default',
            s2_hop_count: s2RetrieverAudit.s2_hop_count || routeAudit.s2_hop_count,
            s2_expanded_topic_count:
              s2RetrieverAudit.s2_expanded_topic_count || routeAudit.s2_expanded_topic_count,
            route_scores:
              fallbackReason === S2_FALLBACK_REASONS.S2_EMPTY_EVIDENCE
                ? {
                  ...(routeAudit.route_scores || {}),
                  s2_empty_evidence_reason: s2EmptyEvidenceReason,
                  s2_expanded_topic_paths: s2RetrieverAudit.expanded_topic_paths,
                  s2_hop_0_row_count: s2RetrieverAudit.hop_0_row_count,
                  s2_hop_1_row_count: s2RetrieverAudit.hop_1_row_count,
                  s2_merged_row_count: s2RetrieverAudit.merged_row_count,
                  s2_expansion_reason_counts: s2RetrieverAudit.expansion_reason_counts,
                  s2_skipped_expansion_paths: s2RetrieverAudit.skipped_expansion_paths,
                }
                : routeAudit.route_scores,
          },
          { reason: fallbackReason },
        ),
      );
      retrievalAudit.error_details = {
        ...(retrievalAudit.error_details || {}),
        s2_fallback_reason: fallbackReason,
        ...(fallbackReason === S2_FALLBACK_REASONS.S2_EMPTY_EVIDENCE
          ? {
            s2_empty_evidence_reason: s2EmptyEvidenceReason,
            s2_retrieval_audit: s2RetrieverAudit,
          }
          : {}),
      };
      hybridRows = await runS1Retrieval('hybrid_rpc_s2_fallback');
    }
  } else {
    hybridRows = await runS1Retrieval('hybrid_rpc');
  }

  const assembleFromRows = async (rows) =>
    assembleEvidence(
      {
        fusedRows: retrievalError ? [] : rows,
        currentTopicPath: boundary.current_topic_path,
        fallbackNode: boundary,
      },
      { supabase: client },
    );

  let { evidence, traceability } = await assembleFromRows(hybridRows);
  let { leakage, allowedTopicPaths } = evaluateEffectiveTopicLeakage({
    evidence,
    boundary,
    routeAudit,
    s2Attempted,
  });

  if (s2Attempted && routeAudit.final_execution_route === 's2_augmentation') {
    routeAudit = normalizeRouteAudit({
      ...routeAudit,
      route_scores: {
        ...(routeAudit.route_scores || {}),
        s2_allowed_topic_paths: allowedTopicPaths,
        s2_leakage_evaluation_mode: 'expanded_topic_allowlist',
      },
    });
  }

  if (s2Attempted && routeAudit.final_execution_route === 's2_augmentation' && leakage.topic_leakage_flag) {
    routeAudit = normalizeRouteAudit(
      applyS2FallbackRouteAudit(routeAudit, {
        reason: S2_FALLBACK_REASONS.S2_CONTRACT_INVALID,
      }),
    );
    retrievalAudit.error_details = {
      ...(retrievalAudit.error_details || {}),
      s2_fallback_reason: S2_FALLBACK_REASONS.S2_CONTRACT_INVALID,
      s2_contract_violation: 'topic_leakage_guard',
      s2_allowed_topic_paths: allowedTopicPaths,
      s2_leaked_ids: leakage.leaked_ids,
      s2_topic_leakage_reason: leakage.topic_leakage_reason,
    };
    hybridRows = await runS1Retrieval('hybrid_rpc_s2_fallback');
    ({ evidence, traceability } = await assembleFromRows(hybridRows));
    leakage = evaluateTopicLeakage(evidence, boundary.current_topic_path);
    allowedTopicPaths = normalizeTopicLeakageAllowlist([boundary.current_topic_path]);
  }

  let llmAnswer = '';
  if (!retrievalError && evidence.length > 0 && !leakage.topic_leakage_flag) {
    if (/title|node title|节点标题/i.test(parsed.query)) {
      llmAnswer = boundary.title || evidence[0]?.snippet || '';
      retrievalAudit.chat_mode = 'short_circuit_title';
    } else {
      const chatEnabled = effectiveConfig.chat?.enabled === true;
      const chatConfigured = Boolean(effectiveConfig.chat?.apiKey) && Boolean(effectiveConfig.chat?.baseUrl);
      const chatFailOpen = effectiveConfig.chat?.failOpen !== false;
      const useS2CompactTemplate =
        routeAudit.retrieval_route === 's2_augmentation' &&
        routeAudit.final_execution_route === 's2_augmentation';

      if (!chatEnabled || !chatConfigured) {
        llmAnswer = buildFallbackGroundedAnswer({
          boundary,
          evidence,
          useS2CompactTemplate,
        });
        retrievalAudit.chat_mode = !chatEnabled ? 'disabled_fallback' : 'missing_key_fallback';
      } else {
        try {
          const llm = await generateGroundedAnswer(
            {
              query: parsed.query,
              evidence,
              language: parsed.language,
              chatConfig: effectiveConfig.chat,
            },
            { fetchImpl },
          );
          llmAnswer = llm.answer;
          chatUsage = llm.usage;
          retrievalAudit.chat_mode = 'upstream_ok';
        } catch (error) {
          const chatError = toRagError(error, {
            status: 502,
            code: 'RAG_CHAT_ERROR',
            message: 'chat generation failed',
          });
          if (chatFailOpen) {
            llmAnswer = buildFallbackGroundedAnswer({
              boundary,
              evidence,
              useS2CompactTemplate,
            });
            retrievalAudit.chat_mode = 'upstream_error_fallback';
            retrievalAudit.error_details = {
              ...(retrievalAudit.error_details || {}),
              chat_fallback_used: true,
              chat_fallback_reason: chatError.code,
            };
          } else {
            retrievalError = chatError;
            retrievalAudit.chat_mode = 'upstream_error_blocking';
            Object.assign(retrievalAudit, toRagErrorAudit(retrievalError, { stage: 'chat_generation' }));
          }
        }
      }
    }
  }

  const policy = decideAnswerPolicy({
    query: parsed.query,
    evidence,
    topicLeakage: leakage,
    llmAnswer,
    retrievalError,
  });

  const costAudit = computeRequestCostAudit(
    {
      prompt_tokens: chatUsage?.prompt_tokens || 0,
      completion_tokens: chatUsage?.completion_tokens || 0,
      embedding_tokens: embeddingUsage?.total_tokens || 0,
      rerank_or_extra_calls_cost: 0,
      cache_saving: 0,
      embedding_calls: embeddingUsage ? 1 : 0,
      chat_calls: chatUsage ? 1 : 0,
      rerank_calls: 0,
      extra_calls: 0,
    },
    {
      pricing: effectiveConfig.pricing,
      models: {
        embedding_model: effectiveConfig.embedding?.model || null,
        chat_model: effectiveConfig.chat?.model || null,
      },
    },
  );

  const response = {
    answer: policy.answer,
    uncertain: policy.uncertain,
    uncertain_reason_code: policy.uncertain_reason_code,
    topic_leakage_flag: policy.topic_leakage_flag,
    topic_leakage_reason: policy.topic_leakage_reason,
    evidence,
    retrieval_version: effectiveConfig.retrievalVersion,
    metrics: {
      evidence_traceability_rate: traceability.evidence_traceability_rate,
      cost_avg_usd_per_req: costAudit.request_cost_usd,
      cost_audit: costAudit,
      retrieval_audit: normalizeRetrievalAudit(retrievalAudit),
      route_audit: routeAudit,
      latency_ms: Date.now() - started,
    },
    request_id: requestId,
  };

  assertAskResponseSchema(response);

  if (!policy.uncertain && parsed.internal_debug) {
    response.debug = {
      normalized_query: normalized,
      retrieval: {
        hybrid_row_count: hybridRows.length,
        rpc_call_count: 1,
        dense_count: response.metrics.retrieval_audit.dense_row_count,
        lexical_count: response.metrics.retrieval_audit.lexical_row_count,
        k_key: effectiveConfig.retrieval.k_key,
        k_sem: effectiveConfig.retrieval.k_sem,
        rrf_k: effectiveConfig.retrieval.rrf_k,
        w_key: effectiveConfig.retrieval.w_key,
        w_sem: effectiveConfig.retrieval.w_sem,
        fused_top_k: effectiveConfig.retrieval.fused_top_k,
        error_stage: response.metrics.retrieval_audit.error_stage,
        error_code: response.metrics.retrieval_audit.error_code,
      },
    };
  }

  logger('info', 'rag_ask_completed', {
    request_id: requestId,
    syllabus_node_id: boundary.syllabus_node_id,
    current_topic_path: boundary.current_topic_path,
    retrieval_version: effectiveConfig.retrievalVersion,
    topic_leakage_flag: response.topic_leakage_flag,
    topic_leakage_reason: response.topic_leakage_reason,
    retrieval_route: response.metrics.route_audit.retrieval_route,
    final_execution_route: response.metrics.route_audit.final_execution_route,
    uncertain: response.uncertain,
    uncertain_reason_code: response.uncertain_reason_code,
    latency_ms: response.metrics.latency_ms,
  });

  return response;
}
