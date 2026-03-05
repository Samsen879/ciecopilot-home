export const S1_2_QUERY_FAMILIES = Object.freeze([
  'definition',
  'concept_explanation',
  'objective_summary',
  'boundary_constrained_lookup',
  'misconception_probe',
  'worked_solution_request',
  'formula_or_latex_noisy_query',
  'bilingual_or_mixed_language_query',
]);

export const S1_2_EXPECTED_BEHAVIORS = Object.freeze(['grounded_answer', 'uncertain']);

export const S1_2_RISK_FAMILIES = Object.freeze([
  'in_scope_grounded',
  'boundary_edge',
  'out_of_scope_probe',
  'insufficient_evidence_probe',
  'formula_noise_grounded',
  'mixed_language_grounded',
]);

export const S1_2_GOLD_LABEL_SOURCE =
  'mixed: curriculum_nodes.title/description (via rag_live_set_v1 seed) + curated benchmark labels';

export const S1_2_FAILURE_CLASSES = Object.freeze([
  'NONE',
  'CONTRACTUAL_UNCERTAIN_EXPECTED',
  'BOUNDARY_LOOKUP_FAILURE',
  'RETRIEVER_INFRA_FAILURE',
  'NO_RELEVANT_CHUNK',
  'KEYWORD_PATH_WEAK',
  'SEMANTIC_PATH_WEAK',
  'RERANK_OR_FUSION_MISS',
  'SOURCE_REF_MISSING',
  'CHAT_OR_RESPONSE_FAILURE',
]);

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function tokenizeKeywords(text) {
  const stopwords = new Set(['the', 'and', 'of', 'a', 'an', 'to', 'in', 'for', 'with', 'use', 'using', 'understand']);
  return Array.from(
    new Set(
      normalizeWhitespace(text)
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5\s^()+\-=/]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token && !stopwords.has(token) && token.length > 1),
    ),
  );
}

function titleKeywords(node) {
  return tokenizeKeywords(node.title).slice(0, 4);
}

function objectiveKeywords(node) {
  return tokenizeKeywords(`${node.title} ${node.description}`).slice(0, 6);
}

function joinParts(...parts) {
  return parts.map((part) => normalizeWhitespace(part)).filter(Boolean).join('. ');
}

function formulaHint(topicFamily) {
  const map = {
    algebra: 'f(a)=0, p(x)',
    coordinate_geometry: 'y = mx + c',
    circular_measure: 'pi radians',
    functions: 'f(g(x))',
    quadratics: 'ax^2 + bx + c',
    series: 'Sigma, (a+b)^n',
    trigonometry: 'sin^2 x, cos x',
    log_and_exp: 'ln x, e^x',
    differentiation: 'd/dx',
    integration: 'integral f(x) dx',
  };
  return map[topicFamily] || 'math notation';
}

function misconceptionDistractor(topicFamily) {
  const map = {
    algebra: 'matrices',
    coordinate_geometry: 'complex numbers',
    circular_measure: 'numerical methods',
    functions: 'probability distributions',
    quadratics: 'vectors',
    series: 'differential equations',
    trigonometry: 'matrices',
    log_and_exp: 'polar coordinates',
    differentiation: 'complex numbers',
    integration: 'numerical methods',
  };
  return map[topicFamily] || 'matrices';
}

function uniqueBy(items, key) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const value = String(item[key] || '');
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(item);
  }
  return out;
}

export function normalizeSourceNodes(liveCases = [], { maxNodes = 30 } = {}) {
  const uniqueNodes = uniqueBy(liveCases, 'syllabus_node_id')
    .filter((item) => item.syllabus_node_id && item.current_topic_path && item.reference_answer)
    .slice(0, maxNodes)
    .map((item, index) => ({
      source_live_case_id: item.case_id,
      syllabus_node_id: item.syllabus_node_id,
      current_topic_path: item.current_topic_path,
      subject_code: item.subject_code || String(item.current_topic_path || '').split('.')[0] || null,
      difficulty: item.difficulty || (index % 3 === 0 ? 'easy' : index % 3 === 1 ? 'medium' : 'hard'),
      topic_family: item.metadata?.topic_family || item.topic_family || String(item.current_topic_path || '').split('.')[2] || 'unknown',
      title: normalizeWhitespace(item.reference_answer),
      description: normalizeWhitespace(item.metadata?.description || item.description || ''),
    }));

  if (uniqueNodes.length < 25) {
    throw new Error('Need at least 25 unique source nodes from rag_live_set_v1.json to build S1.2 dataset');
  }

  return uniqueNodes;
}

function createTemplates() {
  return [
    {
      query_family: 'definition',
      risk_family: 'in_scope_grounded',
      expected_behavior: 'grounded_answer',
      expected_uncertain_reason_code: null,
      buildQuery: () => 'What definition, named idea, or core concept does this syllabus node introduce?',
      buildReferenceAnswer: (node) => joinParts(node.title, node.description),
      buildKeywords: (node) => objectiveKeywords(node),
      min_answer_score: 0.65,
    },
    {
      query_family: 'concept_explanation',
      risk_family: 'in_scope_grounded',
      expected_behavior: 'grounded_answer',
      expected_uncertain_reason_code: null,
      buildQuery: () => 'Explain the core mathematical concept of this syllabus node in one grounded sentence.',
      buildReferenceAnswer: (node) => joinParts(node.title, node.description),
      buildKeywords: (node) => objectiveKeywords(node),
      min_answer_score: 0.65,
    },
    {
      query_family: 'objective_summary',
      risk_family: 'in_scope_grounded',
      expected_behavior: 'grounded_answer',
      expected_uncertain_reason_code: null,
      buildQuery: () => 'What should a student be able to do in this syllabus node?',
      buildReferenceAnswer: (node) => node.description || node.title,
      buildKeywords: (node) => {
        const keywords = objectiveKeywords(node);
        return keywords.length > 0 ? keywords : titleKeywords(node);
      },
      min_answer_score: 0.6,
    },
    {
      query_family: 'boundary_constrained_lookup',
      risk_family: 'boundary_edge',
      expected_behavior: 'grounded_answer',
      expected_uncertain_reason_code: null,
      buildQuery: (node) => `Stay strictly inside the current syllabus node only. Which core topic in "${node.title}" should the answer remain anchored to?`,
      buildReferenceAnswer: (node) => node.title,
      buildKeywords: (node) => titleKeywords(node),
      min_answer_score: 0.6,
    },
    {
      query_family: 'misconception_probe',
      risk_family: 'out_of_scope_probe',
      expected_behavior: 'uncertain',
      expected_uncertain_reason_code: 'QUERY_OUT_OF_SCOPE',
      buildQuery: (node) => `A student says this syllabus node is mainly about ${misconceptionDistractor(node.topic_family)}. Within the current node only, can you confirm that claim?`,
      buildReferenceAnswer: () => '',
      buildKeywords: () => [],
      min_answer_score: 1,
    },
    {
      query_family: 'worked_solution_request',
      risk_family: 'insufficient_evidence_probe',
      expected_behavior: 'uncertain',
      expected_uncertain_reason_code: 'INSUFFICIENT_EVIDENCE',
      buildQuery: (node) => `Give a full worked solution, with all intermediate steps and a final numeric answer, for the syllabus node "${node.title}".`,
      buildReferenceAnswer: () => '',
      buildKeywords: () => [],
      min_answer_score: 1,
    },
    {
      query_family: 'formula_or_latex_noisy_query',
      risk_family: 'formula_noise_grounded',
      expected_behavior: 'grounded_answer',
      expected_uncertain_reason_code: null,
      buildQuery: (node) => `Using noisy notation like ${formulaHint(node.topic_family)}, which syllabus topic inside the current node does this refer to? Keep the answer grounded to this node only.`,
      buildReferenceAnswer: (node) => node.title,
      buildKeywords: (node) => titleKeywords(node),
      min_answer_score: 0.55,
    },
    {
      query_family: 'bilingual_or_mixed_language_query',
      risk_family: 'mixed_language_grounded',
      expected_behavior: 'grounded_answer',
      expected_uncertain_reason_code: null,
      buildQuery: () => '请用简短中文说明 this syllabus node is about what concept or skill, and stay inside the current node.',
      buildReferenceAnswer: (node) => joinParts(node.title, node.description),
      buildKeywords: (node) => objectiveKeywords(node),
      min_answer_score: 0.55,
    },
  ];
}

export function buildS12Dataset(sourceNodes) {
  const templates = createTemplates();
  const cases = [];
  let caseNumber = 1;

  for (const node of sourceNodes) {
    for (const template of templates) {
      cases.push({
        case_id: `s1-2-${String(caseNumber).padStart(3, '0')}`,
        syllabus_node_id: node.syllabus_node_id,
        current_topic_path: node.current_topic_path,
        subject_code: node.subject_code,
        difficulty: node.difficulty,
        query_family: template.query_family,
        risk_family: template.risk_family,
        expected_behavior: template.expected_behavior,
        expected_uncertain_reason_code: template.expected_uncertain_reason_code,
        topic_family: node.topic_family,
        query: template.buildQuery(node),
        reference_answer: template.buildReferenceAnswer(node),
        expected_answer_keywords: template.buildKeywords(node),
        min_answer_score: template.min_answer_score,
        metadata: {
          source_live_case_id: node.source_live_case_id,
          title: node.title,
          description: node.description,
          gold_label_source:
            template.expected_behavior === 'grounded_answer'
              ? 'curriculum_nodes.title + description (via rag_live_set_v1 seed)'
              : 'curated benchmark labels',
          benchmark_tier: 'advisory',
        },
      });
      caseNumber += 1;
    }
  }

  return cases;
}

export function countBy(items, key) {
  return items.reduce((acc, item) => {
    const bucket = String(item[key] || 'unknown');
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
}

export function buildS12Strata(cases) {
  return {
    difficulty: countBy(cases, 'difficulty'),
    subject_code: countBy(cases, 'subject_code'),
    query_family: countBy(cases, 'query_family'),
    risk_family: countBy(cases, 'risk_family'),
    expected_behavior: countBy(cases, 'expected_behavior'),
    topic_family: countBy(cases, 'topic_family'),
  };
}

export function buildS12Manifest(cases, { datasetPath, sourceNodeCount }) {
  return {
    generated_at: new Date().toISOString(),
    dataset: datasetPath,
    benchmark_profile: 'syllabus_qa_core_v1',
    benchmark_tier: 'advisory',
    total_cases: cases.length,
    source_node_count: sourceNodeCount,
    gold_label_source: S1_2_GOLD_LABEL_SOURCE,
    separation_from_s1_smoke: {
      smoke_benchmark_profile: 'title_lookup_boundary_smoke_v1',
      smoke_dataset: 'data/eval/rag_live_set_v1.json',
      current_benchmark_difference: [
        'larger static dataset',
        'realistic query family coverage',
        'diagnostic and failure-class outputs',
        'advisory workflow only',
      ],
    },
    strata: buildS12Strata(cases),
  };
}
