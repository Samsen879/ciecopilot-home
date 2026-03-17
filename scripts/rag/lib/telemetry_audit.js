import fs from 'node:fs';

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function toNullableString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function incrementCount(map, key, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function mapToObject(map) {
  return Object.fromEntries(map.entries());
}

function rankedCountArray(map, label) {
  return [...map.entries()]
    .map(([value, count]) => ({ [label]: value, count }))
    .sort((a, b) => b.count - a.count || String(a[label]).localeCompare(String(b[label])));
}

function rankedValueArray(map) {
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
}

function round(value, digits = 6) {
  return Number(toFiniteNumber(value, 0).toFixed(digits));
}

function mean(values, digits = 6) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return round(values.reduce((sum, value) => sum + toFiniteNumber(value, 0), 0) / values.length, digits);
}

function percentile(values, ratio) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].map((value) => toFiniteNumber(value, 0)).sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(sorted.length * ratio));
  return sorted[rank - 1];
}

function buildPercentiles(values) {
  return {
    p50: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    p99: percentile(values, 0.99),
  };
}

function parseCapturedAt(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveFilterStart({ since, days, now }) {
  if (since) {
    const parsed = Date.parse(String(since));
    if (!Number.isFinite(parsed)) throw new Error(`invalid since filter: ${since}`);
    return parsed;
  }
  if (days == null) return null;
  const resolvedNow = now instanceof Date ? now.getTime() : Date.parse(String(now || ''));
  const nowMs = Number.isFinite(resolvedNow) ? resolvedNow : Date.now();
  return nowMs - Number(days) * 24 * 60 * 60 * 1000;
}

function resolveFilterEnd({ until }) {
  if (!until) return null;
  const parsed = Date.parse(String(until));
  if (!Number.isFinite(parsed)) throw new Error(`invalid until filter: ${until}`);
  return parsed;
}

export function loadRagRequestTelemetryEvents(filePaths = []) {
  const events = [];
  for (const filePath of filePaths) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    for (const line of lines) {
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        throw new Error(`invalid jsonl in ${filePath}: ${error.message}`);
      }
      events.push({
        ...parsed,
        __source_path: filePath,
      });
    }
  }
  return events;
}

export function filterRagRequestTelemetryEvents(
  events = [],
  { since = null, until = null, days = null, subject = null, endpoint = null, now = new Date() } = {},
) {
  const startMs = resolveFilterStart({ since, days, now });
  const endMs = resolveFilterEnd({ until });
  const subjectFilter = toNullableString(subject);
  const endpointFilter = toNullableString(endpoint);

  return events.filter((event) => {
    const capturedAtMs = parseCapturedAt(event.captured_at);
    if (startMs != null && (capturedAtMs == null || capturedAtMs < startMs)) return false;
    if (endMs != null && (capturedAtMs == null || capturedAtMs > endMs)) return false;
    if (subjectFilter && event.subject_code !== subjectFilter) return false;
    if (endpointFilter && event.endpoint !== endpointFilter) return false;
    return true;
  });
}

function buildRouteBucketSummary(events = [], key) {
  const buckets = new Map();
  for (const event of events) {
    const route = toNullableString(event[key]);
    if (!route) continue;
    if (!buckets.has(route)) {
      buckets.set(route, {
        route,
        count: 0,
        latency_ms: [],
        request_cost_usd: [],
      });
    }
    const bucket = buckets.get(route);
    bucket.count += 1;
    bucket.latency_ms.push(toFiniteNumber(event.latency_ms, 0));
    bucket.request_cost_usd.push(toFiniteNumber(event.request_cost_usd, 0));
  }

  return [...buckets.values()].map((bucket) => ({
    route: bucket.route,
    count: bucket.count,
    mean_latency_ms: mean(bucket.latency_ms, 3),
    mean_request_cost_usd: mean(bucket.request_cost_usd, 6),
  }));
}

function buildKnowledgeHoleGroups(events = [], lowRetrievalThreshold = 2) {
  const groups = new Map();
  for (const event of events) {
    const hybridRowCount = toFiniteNumber(event.hybrid_row_count, 0);
    const qualifies =
      hybridRowCount === 0 ||
      hybridRowCount <= lowRetrievalThreshold ||
      event.uncertain_reason_code === 'INSUFFICIENT_EVIDENCE' ||
      event.fallback_reason === 'S2_EMPTY_EVIDENCE' ||
      event.error_stage === 'hybrid_rpc';

    if (!qualifies) continue;

    const subjectCode = event.subject_code || null;
    const topicPath = event.current_topic_path || null;
    const endpoint = event.endpoint || null;
    const key = `${subjectCode || 'unknown'}|${topicPath || 'unknown'}|${endpoint || 'unknown'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        subject_code: subjectCode,
        current_topic_path: topicPath,
        endpoint,
        event_count: 0,
        zero_hit_count: 0,
        low_hit_count: 0,
        uncertain_count: 0,
        representative_fallback_reasons: new Set(),
      });
    }

    const group = groups.get(key);
    group.event_count += 1;
    if (hybridRowCount === 0) group.zero_hit_count += 1;
    if (hybridRowCount > 0 && hybridRowCount <= lowRetrievalThreshold) group.low_hit_count += 1;
    if (event.uncertain_reason_code === 'INSUFFICIENT_EVIDENCE' || event.uncertain_reason_code === 'RETRIEVER_ERROR') {
      group.uncertain_count += 1;
    }
    if (event.fallback_reason) {
      group.representative_fallback_reasons.add(event.fallback_reason);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      representative_fallback_reasons: [...group.representative_fallback_reasons].sort(),
    }))
    .sort(
      (a, b) =>
        b.event_count - a.event_count ||
        b.zero_hit_count - a.zero_hit_count ||
        String(a.subject_code).localeCompare(String(b.subject_code)) ||
        String(a.current_topic_path).localeCompare(String(b.current_topic_path)),
    );
}

function buildRepeatFrictionSessions(events = []) {
  const sessions = new Map();
  for (const event of events) {
    const sessionId = toNullableString(event.client_session_id);
    if (!sessionId) continue;
    const qualifies = Boolean(event.fallback_reason) || event.uncertain === true;
    if (!qualifies) continue;
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        client_session_id: sessionId,
        event_count: 0,
        repeated_fallback_count: 0,
        repeated_uncertain_count: 0,
        fallback_reasons: new Map(),
      });
    }
    const session = sessions.get(sessionId);
    session.event_count += 1;
    if (event.fallback_reason) {
      session.repeated_fallback_count += 1;
      incrementCount(session.fallback_reasons, event.fallback_reason);
    }
    if (event.uncertain === true) {
      session.repeated_uncertain_count += 1;
    }
  }

  return [...sessions.values()]
    .filter((session) => session.repeated_fallback_count >= 2 || session.repeated_uncertain_count >= 2)
    .map((session) => ({
      client_session_id: session.client_session_id,
      event_count: session.event_count,
      repeated_fallback_count: session.repeated_fallback_count,
      repeated_uncertain_count: session.repeated_uncertain_count,
      dominant_fallback_reason: rankedCountArray(session.fallback_reasons, 'reason')[0]?.reason || null,
    }))
    .sort(
      (a, b) =>
        b.repeated_fallback_count - a.repeated_fallback_count ||
        b.repeated_uncertain_count - a.repeated_uncertain_count ||
        a.client_session_id.localeCompare(b.client_session_id),
    );
}

function buildRecommendedActions({
  events,
  knowledgeHoleGroups,
  fallbackCounts,
  readinessGuardCount,
  killSwitchCount,
}) {
  const actions = [];
  const s2TimeoutGroups = new Map();
  const s2EmptyEvidenceGroups = new Map();
  const retrieverErrorGroups = new Map();

  for (const event of events) {
    const key = `${event.subject_code || ''}|${event.current_topic_path || ''}`;
    if (event.fallback_reason === 'S2_TIMEOUT') {
      incrementCount(s2TimeoutGroups, key);
    }
    if (event.fallback_reason === 'S2_EMPTY_EVIDENCE') {
      incrementCount(s2EmptyEvidenceGroups, key);
    }
    if (event.error_stage === 'hybrid_rpc') {
      incrementCount(retrieverErrorGroups, key);
    }
  }

  for (const [key, count] of s2TimeoutGroups.entries()) {
    if (count < 2) continue;
    const [targetSubject, targetTopicPath] = key.split('|');
    actions.push({
      score: 100 + count * 10,
      action_type: 'runtime_budget',
      priority: 'high',
      reason: `Repeated S2 timeouts are concentrating on ${targetSubject || 'unknown'} ${targetTopicPath || 'unknown'}.`,
      evidence: {
        fallback_reason: 'S2_TIMEOUT',
        count,
      },
      target_subject: targetSubject || null,
      target_topic_path: targetTopicPath || null,
      suggested_owner_surface: 'api/rag',
    });
  }

  for (const [key, count] of s2EmptyEvidenceGroups.entries()) {
    if (count < 2) continue;
    const [targetSubject, targetTopicPath] = key.split('|');
    actions.push({
      score: 90 + count * 10,
      action_type: 'evidence_gap',
      priority: 'high',
      reason: `Repeated empty-evidence fallbacks suggest a real evidence gap for ${targetSubject || 'unknown'} ${targetTopicPath || 'unknown'}.`,
      evidence: {
        fallback_reason: 'S2_EMPTY_EVIDENCE',
        count,
      },
      target_subject: targetSubject || null,
      target_topic_path: targetTopicPath || null,
      suggested_owner_surface: 'data/evidence/production',
    });
  }

  for (const [key, count] of retrieverErrorGroups.entries()) {
    const [targetSubject, targetTopicPath] = key.split('|');
    actions.push({
      score: 70 + count * 10,
      action_type: 'benchmark_followup',
      priority: count >= 2 ? 'high' : 'medium',
      reason: `Retriever transport failures are visible for ${targetSubject || 'unknown'} ${targetTopicPath || 'unknown'}.`,
      evidence: {
        error_stage: 'hybrid_rpc',
        count,
      },
      target_subject: targetSubject || null,
      target_topic_path: targetTopicPath || null,
      suggested_owner_surface: 'scripts/rag',
    });
  }

  if (readinessGuardCount > 0) {
    const topGroup = knowledgeHoleGroups[0] || null;
    actions.push({
      score: 50 + readinessGuardCount * 5,
      action_type: 'route_tune',
      priority: 'medium',
      reason: 'Readiness guard is still forcing some traffic back to S1.',
      evidence: {
        route_reason: 's2_readiness_guard_default_s1',
        count: readinessGuardCount,
      },
      target_subject: topGroup?.subject_code || null,
      target_topic_path: topGroup?.current_topic_path || null,
      suggested_owner_surface: 'api/rag',
    });
  }

  if (killSwitchCount > 0) {
    actions.push({
      score: 60 + killSwitchCount * 5,
      action_type: 'kill_switch_review',
      priority: 'high',
      reason: 'S2 route kill switch is showing up in live request telemetry.',
      evidence: {
        fallback_reason: 'S2_ROUTE_KILL_SWITCH',
        count: killSwitchCount,
      },
      target_subject: null,
      target_topic_path: null,
      suggested_owner_surface: 'api/rag',
    });
  }

  return actions
    .sort((a, b) => b.score - a.score || a.action_type.localeCompare(b.action_type))
    .map(({ score, ...action }) => action);
}

export function buildRagRequestTelemetryAudit({
  events = [],
  filters = {},
  lowRetrievalThreshold = 2,
  now = new Date(),
} = {}) {
  const filteredEvents = filterRagRequestTelemetryEvents(events, { ...filters, now });
  const endpointCounts = new Map();
  const subjectCounts = new Map();
  const retrievalRouteCounts = new Map();
  const finalExecutionRouteCounts = new Map();
  const fallbackCounts = new Map();
  const errorCounts = new Map();
  const failureStageCounts = new Map();
  const uncertainReasonCounts = new Map();
  const rolloutBySubject = new Map();
  const rolloutBundleCounts = new Map();
  const rolloutCorpusCounts = new Map();
  const topicPathCounts = new Map();
  const routeBuckets = buildRouteBucketSummary(filteredEvents, 'retrieval_route');

  let successCount = 0;
  let failureCount = 0;
  let s2FallbackCount = 0;
  let readinessGuardCount = 0;
  let killSwitchCount = 0;
  const latencies = [];
  const retrievalLatencies = [];
  const llmLatencies = [];
  const requestCosts = [];
  const promptTokens = [];
  const completionTokens = [];
  const subjectLatency = new Map();

  for (const event of filteredEvents) {
    if (event.success === true) {
      successCount += 1;
    } else {
      failureCount += 1;
    }

    incrementCount(endpointCounts, event.endpoint);
    incrementCount(subjectCounts, event.subject_code);
    incrementCount(retrievalRouteCounts, event.retrieval_route);
    incrementCount(finalExecutionRouteCounts, event.final_execution_route);
    incrementCount(topicPathCounts, event.current_topic_path);

    if (event.fallback_reason) {
      incrementCount(fallbackCounts, event.fallback_reason);
      s2FallbackCount += 1;
      if (event.fallback_reason === 'S2_ROUTE_KILL_SWITCH') {
        killSwitchCount += 1;
      }
    }
    if (event.error_code) incrementCount(errorCounts, event.error_code);
    if (event.failure_stage || event.error_stage) {
      incrementCount(failureStageCounts, event.failure_stage || event.error_stage);
    }
    if (event.uncertain_reason_code) incrementCount(uncertainReasonCounts, event.uncertain_reason_code);
    if (event.route_reason === 's2_readiness_guard_default_s1') readinessGuardCount += 1;

    if (event.route_score_excerpt?.production_evidence_rollout_active === true) {
      incrementCount(rolloutBySubject, event.subject_code);
      for (const bundleId of event.route_score_excerpt.production_evidence_rollout_bundle_ids || []) {
        incrementCount(rolloutBundleCounts, bundleId);
      }
      for (const corpusVersion of event.route_score_excerpt.production_evidence_rollout_corpus_versions || []) {
        incrementCount(rolloutCorpusCounts, corpusVersion);
      }
    }

    latencies.push(toFiniteNumber(event.latency_ms, 0));
    retrievalLatencies.push(toFiniteNumber(event.retrieval_latency_ms, 0));
    llmLatencies.push(toFiniteNumber(event.llm_latency_ms, 0));
    requestCosts.push(toFiniteNumber(event.request_cost_usd, 0));
    promptTokens.push(toFiniteNumber(event.prompt_tokens, 0));
    completionTokens.push(toFiniteNumber(event.completion_tokens, 0));

    const subjectCode = toNullableString(event.subject_code);
    if (subjectCode) {
      if (!subjectLatency.has(subjectCode)) subjectLatency.set(subjectCode, []);
      subjectLatency.get(subjectCode).push(toFiniteNumber(event.latency_ms, 0));
    }
  }

  const knowledgeHoleGroups = buildKnowledgeHoleGroups(filteredEvents, lowRetrievalThreshold);
  const repeatFrictionSessions = buildRepeatFrictionSessions(filteredEvents);
  const highestCostRouteBucket =
    [...routeBuckets].sort((a, b) => b.mean_request_cost_usd - a.mean_request_cost_usd || b.count - a.count)[0] ||
    null;
  const highestLatencyRouteBucket =
    [...routeBuckets].sort((a, b) => b.mean_latency_ms - a.mean_latency_ms || b.count - a.count)[0] || null;

  return {
    traffic_mix: {
      total_requests: filteredEvents.length,
      success_count: successCount,
      failure_count: failureCount,
      endpoint_counts: mapToObject(endpointCounts),
      subject_counts: mapToObject(subjectCounts),
      topic_path_coverage_count: topicPathCounts.size,
    },
    route_mix: {
      retrieval_route_counts: mapToObject(retrievalRouteCounts),
      final_execution_route_counts: mapToObject(finalExecutionRouteCounts),
      s2_fallback_count: s2FallbackCount,
      readiness_guard_default_s1_count: readinessGuardCount,
      kill_switch_triggered_count: killSwitchCount,
    },
    fallback_clusters: rankedCountArray(fallbackCounts, 'reason'),
    error_clusters: rankedCountArray(errorCounts, 'code'),
    failure_stage_clusters: rankedCountArray(failureStageCounts, 'stage'),
    uncertain_reason_clusters: rankedCountArray(uncertainReasonCounts, 'reason'),
    knowledge_hole_groups: knowledgeHoleGroups,
    latency_cost: {
      latency_ms: buildPercentiles(latencies),
      retrieval_latency_ms: buildPercentiles(retrievalLatencies),
      llm_latency_ms: buildPercentiles(llmLatencies),
      mean_request_cost_usd: mean(requestCosts, 6),
      mean_prompt_tokens: mean(promptTokens, 3),
      mean_completion_tokens: mean(completionTokens, 3),
      highest_cost_route_bucket: highestCostRouteBucket,
      highest_latency_route_bucket: highestLatencyRouteBucket,
      subject_latency_comparison: Object.fromEntries(
        [...subjectLatency.entries()].map(([subjectCode, values]) => [
          subjectCode,
          {
            count: values.length,
            mean_latency_ms: mean(values, 3),
          },
        ]),
      ),
    },
    rollout_exposure: {
      active_count: [...rolloutBySubject.values()].reduce((sum, value) => sum + value, 0),
      by_subject: mapToObject(rolloutBySubject),
      bundle_ids: rankedValueArray(rolloutBundleCounts),
      corpus_versions: rankedValueArray(rolloutCorpusCounts),
    },
    repeat_friction_sessions: repeatFrictionSessions,
    recommended_actions: buildRecommendedActions({
      events: filteredEvents,
      knowledgeHoleGroups,
      fallbackCounts,
      readinessGuardCount,
      killSwitchCount,
    }),
  };
}
