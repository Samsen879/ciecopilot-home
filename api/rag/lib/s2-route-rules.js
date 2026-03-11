function normalizeQuery(query) {
  return String(query || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const POSITIVE_RULES = Object.freeze([
  { label: 'cross_topic', regex: /跨章节|跨单元|cross-topic|across chapters/i, weight: 2 },
  { label: 'global_planning', regex: /学习计划|revision plan|study plan/i, weight: 2 },
  { label: 'prerequisite_chain', regex: /先修|prerequisite|依赖关系|dependency chain/i, weight: 2 },
  { label: 'connect_topics', regex: /关联.*两个主题|connect .* topics/i, weight: 2 },
]);

const NEGATIVE_RULES = Object.freeze([
  { label: 'current_node_only', regex: /当前节点|current node only/i, weight: -2 },
  { label: 'definition_lookup', regex: /定义是什么|what is the definition/i, weight: -2 },
  { label: 'node_title_lookup', regex: /节点标题|node title/i, weight: -2 },
  {
    label: 'single_node_factoid',
    regex: /this syllabus node|当前考纲节点|within the current node/i,
    weight: -1,
  },
]);

function collectMatches(normalizedQuery, rules) {
  const hits = [];
  let score = 0;
  for (const rule of rules) {
    if (rule.regex.test(normalizedQuery)) {
      hits.push(rule.label);
      score += rule.weight;
    }
  }
  return { hits, score };
}

export function evaluateS2RouteByRules(query) {
  const normalizedQuery = normalizeQuery(query);
  const positive = collectMatches(normalizedQuery, POSITIVE_RULES);
  const negative = collectMatches(normalizedQuery, NEGATIVE_RULES);
  const ruleScore = positive.score + negative.score;

  let retrievalRoute = 's1_default';
  let routeReason = 'rules_ambiguous_default_s1';

  if (ruleScore >= 2) {
    retrievalRoute = 's2_augmentation';
    routeReason = 'rules_positive_signal';
  } else if (ruleScore <= -1) {
    retrievalRoute = 's1_default';
    routeReason = 'rules_negative_signal';
  }

  return {
    retrieval_route: retrievalRoute,
    route_reason: routeReason,
    route_stage: 'rules',
    route_scores: {
      rule_score: ruleScore,
      positive_hit_count: positive.hits.length,
      negative_hit_count: negative.hits.length,
      matched_positive_labels: positive.hits,
      matched_negative_labels: negative.hits,
    },
  };
}

export const S2_ROUTE_RULES_VERSION = 's2_route_rules_v1';
