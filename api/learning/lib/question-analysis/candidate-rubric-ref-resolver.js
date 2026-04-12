function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const SEEDED_CANDIDATE_RUBRIC_REFS = Object.freeze({
  '9709.trigonometry.identities': Object.freeze([
    Object.freeze({
      kind: 'rubric_release',
      rubric_set_id: '9709.trigonometry.identities',
      rubric_version_id: 'trig-identities-v1',
      scope_level: 'question_type',
      release_state: 'released',
    }),
  ]),
  '9709.trigonometry.equations': Object.freeze([
    Object.freeze({
      kind: 'rubric_release',
      rubric_set_id: '9709.trigonometry.equations',
      rubric_version_id: 'trig-equations-v1',
      scope_level: 'question_type',
      release_state: 'released',
    }),
  ]),
  '9709.integration.application': Object.freeze([
    Object.freeze({
      kind: 'rubric_release',
      rubric_set_id: '9709.integration.application',
      rubric_version_id: 'integration-application-v1',
      scope_level: 'question_type',
      release_state: 'released',
    }),
  ]),
  '9709.differential_equations.separable': Object.freeze([
    Object.freeze({
      kind: 'rubric_release',
      rubric_set_id: '9709.differential_equations.separable',
      rubric_version_id: 'differential-separable-v1',
      scope_level: 'question_type',
      release_state: 'released',
    }),
  ]),
});

export function resolveCandidateRubricRefs({
  questionTypeId,
  providedRefs = [],
} = {}) {
  if (Array.isArray(providedRefs) && providedRefs.length > 0) {
    return cloneJson(providedRefs);
  }

  const seededRefs = SEEDED_CANDIDATE_RUBRIC_REFS[normalizeString(questionTypeId)] ?? [];
  return cloneJson(seededRefs);
}
