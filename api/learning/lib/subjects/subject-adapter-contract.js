function freezeList(values) {
  return Object.freeze([...values]);
}

function freezeArea(area = {}) {
  return Object.freeze({ ...area });
}

function assertFunction(path, value) {
  if (typeof value !== 'function') {
    throw new TypeError(`${path} must be a function.`);
  }
}

function assertMeta(meta = {}) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    throw new TypeError('meta must be an object.');
  }

  if (typeof meta.subject_code !== 'string' || !meta.subject_code.trim()) {
    throw new TypeError('meta.subject_code is required.');
  }

  if (typeof meta.runtime_enabled !== 'boolean') {
    throw new TypeError('meta.runtime_enabled must be a boolean.');
  }
}

export const RUNTIME_CORE_OWNERSHIP = freezeList([
  'study-session lifecycle and typed active_scope_bundle persistence',
  'workspace, artifact, and review-task repositories plus immutable lineage',
  'reconciliation, idempotency, and generic learning HTTP/error envelopes',
  'generic released-family evidence gates and conservative fallback invariants',
]);

export const SUBJECT_ADAPTER_OWNERSHIP = Object.freeze({
  classification: freezeList([
    'question family/type semantics and canonical import normalization',
    'subject-owned runtime context defaults and import-time taxonomy mapping',
  ]),
  marking: freezeList([
    'released scoring posture interpretation for subject question types',
    'subject-specific rubric and uncertainty semantics above core invariants',
  ]),
  mastery: freezeList([
    'mastery signal allocation and type-versus-family promotion semantics',
    'subject-specific local signal weighting and conservative fallback behavior',
  ]),
  review: freezeList([
    'review trigger routing and subject-specific scheduling semantics',
    'subject-owned review posture for misconception-heavy or non-math flows',
  ]),
});

export function createSubjectAdapter(definition = {}) {
  const meta = definition.meta ?? {};
  const classification = definition.classification ?? {};
  const marking = definition.marking ?? {};
  const mastery = definition.mastery ?? {};
  const review = definition.review ?? {};

  assertMeta(meta);
  assertFunction('classification.mergeCanonicalClassification', classification.mergeCanonicalClassification);
  assertFunction('marking.resolveReleasedScoringPosture', marking.resolveReleasedScoringPosture);
  assertFunction('mastery.buildMasteryProjection', mastery.buildMasteryProjection);
  assertFunction('review.buildSchedulerSeed', review.buildSchedulerSeed);

  return Object.freeze({
    meta: Object.freeze({ ...meta }),
    classification: freezeArea(classification),
    marking: freezeArea(marking),
    mastery: freezeArea(mastery),
    review: freezeArea(review),
  });
}
