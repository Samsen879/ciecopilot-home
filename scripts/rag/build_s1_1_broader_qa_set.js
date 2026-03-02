#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_1_broader_qa_v1.json');
const MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_1_broader_qa_v1_manifest.json');
const LEGACY_OUT_FILE = path.join(ROOT, 'data', 'eval', 'rag_broader_qa_set_v1.json');
const LEGACY_MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_broader_qa_set_v1_manifest.json');

const SOURCE_NODES = [
  {
    source_live_case_id: 'live-005',
    syllabus_node_id: '3f03d2b4-bf56-411f-96b8-5f35923cdf8e',
    current_topic_path: '9709.P2.Algebra.LO3',
    subject_code: '9709',
    difficulty: 'medium',
    topic_family: 'algebra',
    title: 'Factor and remainder theorems',
    description: 'Use the factor theorem and the remainder theorem',
    title_keywords: ['factor theorem', 'remainder theorem'],
    objective_keywords: ['factor theorem', 'remainder theorem'],
  },
  {
    source_live_case_id: 'live-006',
    syllabus_node_id: '0cdb393b-e3c2-4fe6-a6ae-1c12794ba476',
    current_topic_path: '9709.P1.CoordinateGeometry.LO1',
    subject_code: '9709',
    difficulty: 'hard',
    topic_family: 'coordinate_geometry',
    title: 'Equation of straight line',
    description: 'Find the equation of a straight line given sufficient information',
    title_keywords: ['equation', 'straight line'],
    objective_keywords: ['equation', 'straight line', 'sufficient information'],
  },
  {
    source_live_case_id: 'live-023',
    syllabus_node_id: 'a85f6db4-3a48-448e-9eb9-2e5906e5aa0a',
    current_topic_path: '9709.P1.CircularMeasure.LO1',
    subject_code: '9709',
    difficulty: 'medium',
    topic_family: 'circular_measure',
    title: 'Radians',
    description: 'Understand the definition of a radian, and use the relationship between radians and degrees',
    title_keywords: ['radian', 'radians'],
    objective_keywords: ['radian', 'radians', 'degrees'],
  },
  {
    source_live_case_id: 'live-028',
    syllabus_node_id: 'f916e792-9925-4fef-ac97-49a48be5529f',
    current_topic_path: '9709.P1.Functions.LO2',
    subject_code: '9709',
    difficulty: 'easy',
    topic_family: 'functions',
    title: 'Range and composition',
    description: 'Identify the range of a given function in simple cases, and find the composition of two given functions',
    title_keywords: ['range', 'composition'],
    objective_keywords: ['range', 'composition', 'function'],
  },
  {
    source_live_case_id: 'live-032',
    syllabus_node_id: 'de38dda2-94fe-4589-8869-34cefcf94cac',
    current_topic_path: '9709.P1.Quadratics.LO2',
    subject_code: '9709',
    difficulty: 'medium',
    topic_family: 'quadratics',
    title: 'Discriminant',
    description: 'Find the discriminant of a quadratic polynomial ax^2 + bx + c and use the discriminant',
    title_keywords: ['discriminant', 'quadratic polynomial'],
    objective_keywords: ['discriminant', 'quadratic polynomial', 'ax^2 + bx + c'],
  },
  {
    source_live_case_id: 'live-034',
    syllabus_node_id: '910c64cd-c6d0-4bb9-b0e6-1c7d2e1ed6df',
    current_topic_path: '9709.P1.Series.LO1',
    subject_code: '9709',
    difficulty: 'easy',
    topic_family: 'series',
    title: 'Binomial expansion',
    description: 'Use the expansion of (a + b)^n where n is a positive integer',
    title_keywords: ['binomial expansion', '(a + b)^n'],
    objective_keywords: ['binomial expansion', '(a + b)^n', 'positive integer'],
  },
  {
    source_live_case_id: 'live-037',
    syllabus_node_id: 'a5d4c2d3-a65c-4334-87f5-0384be6179cc',
    current_topic_path: '9709.P1.Trigonometry.LO1',
    subject_code: '9709',
    difficulty: 'easy',
    topic_family: 'trigonometry',
    title: 'Trig graphs',
    description:
      'Sketch and use graphs of the sine, cosine and tangent functions (for angles of any size, and using either degrees or radians)',
    title_keywords: ['sine', 'cosine', 'tangent'],
    objective_keywords: ['sine', 'cosine', 'tangent', 'degrees', 'radians'],
  },
  {
    source_live_case_id: 'live-042',
    syllabus_node_id: 'fb780d43-9af8-410b-be05-5720ae3edd78',
    current_topic_path: '9709.P2.LogAndExp.LO2',
    subject_code: '9709',
    difficulty: 'hard',
    topic_family: 'log_and_exp',
    title: 'e and ln',
    description:
      'Understand the definition and properties of e^x and ln x, including their relationship as inverse functions and their graphs',
    title_keywords: ['e^x', 'ln x'],
    objective_keywords: ['e^x', 'ln x', 'inverse functions', 'graphs'],
  },
  {
    source_live_case_id: 'live-048',
    syllabus_node_id: '95bc8512-14c4-4810-a429-41fcfe164da2',
    current_topic_path: '9709.P1.Differentiation.LO1',
    subject_code: '9709',
    difficulty: 'hard',
    topic_family: 'differentiation',
    title: 'Gradient as limit',
    description:
      'Understand the gradient of a curve at a point as the limit of the gradients of a suitable sequence of chords, and use standard notations for derivatives',
    title_keywords: ['gradient', 'limit'],
    objective_keywords: ['gradient', 'limit', 'sequence of chords', 'derivatives'],
  },
  {
    source_live_case_id: 'live-052',
    syllabus_node_id: '41194697-4ccf-41ef-9879-8a37744544d2',
    current_topic_path: '9709.P1.Integration.LO2',
    subject_code: '9709',
    difficulty: 'easy',
    topic_family: 'integration',
    title: 'Constant of integration',
    description: 'Solve problems involving the evaluation of a constant of integration',
    title_keywords: ['constant of integration'],
    objective_keywords: ['constant of integration', 'solve problems', 'evaluation'],
  },
  {
    source_live_case_id: 'live-053',
    syllabus_node_id: '70b51927-d9e7-4d72-bc58-b36e9be36c7b',
    current_topic_path: '9709.P1.Integration.LO3',
    subject_code: '9709',
    difficulty: 'medium',
    topic_family: 'integration',
    title: 'Definite integrals',
    description: 'Evaluate definite integrals',
    title_keywords: ['definite integrals'],
    objective_keywords: ['definite integrals', 'evaluate'],
  },
  {
    source_live_case_id: 'live-054',
    syllabus_node_id: '3783f77b-259b-4169-bd95-8e312ff7a677',
    current_topic_path: '9709.P1.Series.LO4',
    subject_code: '9709',
    difficulty: 'hard',
    topic_family: 'series',
    title: 'Convergence',
    description:
      'Use the condition for the convergence of a geometric progression, and the formula for the sum to infinity of a convergent geometric progression',
    title_keywords: ['convergence', 'geometric progression'],
    objective_keywords: ['convergence', 'geometric progression', 'sum to infinity'],
  },
];

const QUERY_TEMPLATES = [
  {
    query_style: 'concept_lookup',
    scenario_type: 'in_scope_grounded',
    expected_behavior: 'grounded_answer',
    prompt: 'Which named concept or skill is this syllabus node about?',
    reference_answer: (node) => node.title,
    expected_answer_keywords: (node) => node.title_keywords,
    min_answer_score: 0.75,
  },
  {
    query_style: 'focus_summary',
    scenario_type: 'in_scope_grounded',
    expected_behavior: 'grounded_answer',
    prompt: 'What mathematical focus does this syllabus node cover?',
    reference_answer: (node) => `${node.title}. ${node.description}.`,
    expected_answer_keywords: (node) => uniqueKeywords([...node.title_keywords, ...node.objective_keywords]).slice(0, 5),
    min_answer_score: 0.6,
  },
  {
    query_style: 'objective_summary',
    scenario_type: 'in_scope_grounded',
    expected_behavior: 'grounded_answer',
    prompt: 'What should a student be able to do in this syllabus node?',
    reference_answer: (node) => node.description,
    expected_answer_keywords: (node) => node.objective_keywords,
    min_answer_score: 0.6,
  },
  {
    query_style: 'boundary_edge',
    scenario_type: 'boundary_edge',
    expected_behavior: 'grounded_answer',
    prompt: (node) =>
      `Stay strictly inside the current syllabus node only. Which core concept in "${node.title}" should the answer remain anchored to?`,
    reference_answer: (node) => node.title,
    expected_answer_keywords: (node) => node.title_keywords,
    min_answer_score: 0.6,
  },
  {
    query_style: 'insufficient_evidence_probe',
    scenario_type: 'insufficient_evidence',
    expected_behavior: 'uncertain',
    expected_uncertain_reason_code: 'INSUFFICIENT_EVIDENCE',
    prompt: (node) =>
      `Give a full worked example, including all intermediate steps and a final answer, for the syllabus node "${node.title}".`,
    reference_answer: () => '',
    expected_answer_keywords: () => [],
    min_answer_score: 1,
  },
  {
    query_style: 'conflict_probe',
    scenario_type: 'evidence_conflict',
    expected_behavior: 'uncertain',
    expected_uncertain_reason_code: 'CONFLICTING_EVIDENCE',
    prompt: (node) =>
      `Identify any conflicting interpretation or contradictory statement inside the evidence for the syllabus node "${node.title}". If there is conflict, say so.`,
    reference_answer: () => '',
    expected_answer_keywords: () => [],
    min_answer_score: 1,
  },
  {
    query_style: 'out_of_scope_probe',
    scenario_type: 'out_of_scope',
    expected_behavior: 'uncertain',
    expected_uncertain_reason_code: 'QUERY_OUT_OF_SCOPE',
    prompt: (node) =>
      `Beyond the current syllabus node "${node.title}", does this node also teach matrices, complex numbers, or numerical methods?`,
    reference_answer: () => '',
    expected_answer_keywords: () => [],
    min_answer_score: 1,
  },
];

function uniqueKeywords(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = String(value || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(String(value).trim());
  }
  return out;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const bucket = String(item[key] || 'unknown');
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
}

function main() {
  const cases = [];
  let caseNumber = 1;

  for (const node of SOURCE_NODES) {
    for (const template of QUERY_TEMPLATES) {
      cases.push({
        case_id: `s1-1-${String(caseNumber).padStart(3, '0')}`,
        syllabus_node_id: node.syllabus_node_id,
        current_topic_path: node.current_topic_path,
        subject_code: node.subject_code,
        difficulty: node.difficulty,
        query_style: template.query_style,
        scenario_type: template.scenario_type,
        expected_behavior: template.expected_behavior,
        expected_uncertain_reason_code: template.expected_uncertain_reason_code || null,
        topic_family: node.topic_family,
        query: typeof template.prompt === 'function' ? template.prompt(node) : template.prompt,
        reference_answer: template.reference_answer(node),
        expected_answer_keywords: template.expected_answer_keywords(node),
        min_answer_score: template.min_answer_score,
        metadata: {
          source_live_case_id: node.source_live_case_id,
          title: node.title,
          description: node.description,
          gold_label_source: 'curated curriculum_nodes title + description',
          benchmark_tier: 'advisory',
        },
      });
      caseNumber += 1;
    }
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    dataset: path.relative(ROOT, OUT_FILE).replace(/\\/g, '/'),
    benchmark_profile: 'broader_qa_advisory_v1',
    benchmark_tier: 'advisory',
    total_cases: cases.length,
    source_node_count: SOURCE_NODES.length,
    gold_label_source: 'curated curriculum_nodes title + description',
    separation_from_s1_smoke: {
      smoke_benchmark_profile: 'title_lookup_boundary_smoke_v1',
      smoke_dataset: 'data/eval/rag_live_set_v1.json',
      current_benchmark_difference: [
        'static curated dataset',
        'broader query styles (concept lookup, focus summary, objective summary)',
        'non-blocking advisory workflow',
      ],
    },
    strata: {
      difficulty: countBy(cases, 'difficulty'),
      query_style: countBy(cases, 'query_style'),
      scenario_type: countBy(cases, 'scenario_type'),
      topic_family: countBy(cases, 'topic_family'),
      subject_code: countBy(cases, 'subject_code'),
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(cases, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(LEGACY_OUT_FILE, `${JSON.stringify(cases, null, 2)}\n`, 'utf8');
  fs.writeFileSync(LEGACY_MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n${MANIFEST_FILE}\n${LEGACY_OUT_FILE}\n${LEGACY_MANIFEST_FILE}\n`);
}

main();
