import {
  buildQuestionRef,
  buildQuestionTypeRef,
} from '../../learning/lib/contracts/runtime-contract.js';

function normalizeNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseLegacyScopeToken(value) {
  const normalized = normalizeNullableString(value);
  if (!normalized) {
    return {
      part_id: null,
      subpart_id: null,
    };
  }

  const [root] = normalized.split('_');
  const normalizedRoot = normalizeNullableString(root);
  if (!normalizedRoot) {
    return {
      part_id: null,
      subpart_id: null,
    };
  }

  return {
    part_id: normalizedRoot,
    subpart_id: normalized.includes('_') ? normalized : null,
  };
}

function normalizePartSubpart(partValue, subpartValue) {
  const normalizedPartId = normalizeNullableString(partValue);
  const normalizedSubpartToken = normalizeNullableString(subpartValue);
  const parsedToken = parseLegacyScopeToken(normalizedSubpartToken);

  if (
    normalizedPartId
    && parsedToken.part_id
    && parsedToken.part_id !== normalizedPartId
  ) {
    return {
      part_id: null,
      subpart_id: null,
      ambiguous: true,
    };
  }

  return {
    part_id: normalizedPartId || parsedToken.part_id || null,
    subpart_id: parsedToken.subpart_id,
    ambiguous: false,
  };
}

function resolveRequestScope({
  requestPartId = null,
  requestSubpartId = null,
} = {}) {
  return normalizePartSubpart(requestPartId, requestSubpartId);
}

function resolvePartMapping({
  decision = {},
  rubricPoint = {},
  requestScope = {},
} = {}) {
  const candidates = [
    {
      source: 'decision',
      partValue: decision.part_id ?? decision.partId ?? decision.part ?? null,
      subpartValue: decision.subpart_id ?? decision.subpartId ?? decision.subpart ?? null,
    },
    {
      source: 'rubric',
      partValue: rubricPoint.part_id ?? rubricPoint.partId ?? rubricPoint.part ?? null,
      subpartValue: rubricPoint.subpart_id ?? rubricPoint.subpartId ?? rubricPoint.subpart ?? null,
    },
    {
      source: 'request',
      partValue: requestScope.part_id ?? null,
      subpartValue: requestScope.subpart_id ?? null,
    },
  ];

  for (const candidate of candidates) {
    const normalized = normalizePartSubpart(candidate.partValue, candidate.subpartValue);
    if (normalized.ambiguous) {
      return {
        part_id: null,
        subpart_id: null,
        mapping_source: 'ambiguous',
      };
    }

    if (normalized.part_id || normalized.subpart_id) {
      return {
        part_id: normalized.part_id,
        subpart_id: normalized.subpart_id,
        mapping_source: candidate.source,
      };
    }
  }

  return {
    part_id: null,
    subpart_id: null,
    mapping_source: 'none',
  };
}

function buildUncertainFlags(decision = {}) {
  return uniq([
    normalizeNullableString(decision.uncertain_reason),
    decision.reason && decision.reason !== 'best_match'
      ? normalizeNullableString(decision.reason)
      : null,
  ]);
}

function buildRubricPointResult({
  decision = {},
  rubricPoint = {},
  mapping = {},
} = {}) {
  return {
    rubric_id: decision.rubric_id ?? rubricPoint.rubric_id ?? null,
    mark_label: decision.mark_label ?? rubricPoint.mark_label ?? null,
    awarded: decision.awarded === true,
    awarded_marks: toNumber(decision.awarded_marks),
    score_max: toNumber(rubricPoint.marks),
    reason: decision.reason ?? null,
    alignment_confidence:
      decision.alignment_confidence === undefined ? null : decision.alignment_confidence,
    evidence_spans: normalizeArray(decision.evidence_spans),
    part_id: mapping.part_id,
    subpart_id: mapping.subpart_id,
    mapping_source: mapping.mapping_source,
    uncertain_flags: buildUncertainFlags(decision),
  };
}

function buildDiagnostics(partResults = [], pointResults = []) {
  return {
    by_part: partResults.map((partResult) => ({
      part_id: partResult.part_id,
      subpart_id: partResult.subpart_id,
      incorrect_rubric_ids: partResult.rubric_point_results
        .filter((item) => item.awarded !== true)
        .map((item) => item.rubric_id),
    })),
    aggregate: {
      awarded_rubric_ids: pointResults
        .filter((item) => item.awarded === true)
        .map((item) => item.rubric_id),
      incorrect_rubric_ids: pointResults
        .filter((item) => item.awarded !== true)
        .map((item) => item.rubric_id),
    },
  };
}

export function buildMarkingResult({
  questionId,
  attemptId = null,
  markRunId = null,
  questionTypeId = null,
  requestPartId = null,
  requestSubpartId = null,
  decisions = [],
  rubricPoints = [],
} = {}) {
  const requestScope = resolveRequestScope({
    requestPartId,
    requestSubpartId,
  });
  const decisionByRubricId = new Map(
    normalizeArray(decisions).map((decision) => [String(decision.rubric_id), decision]),
  );
  const pointByRubricId = new Map(
    normalizeArray(rubricPoints).map((point) => [String(point.rubric_id), point]),
  );
  const rubricIds = uniq([
    ...normalizeArray(rubricPoints).map((point) => normalizeNullableString(point.rubric_id)),
    ...normalizeArray(decisions).map((decision) => normalizeNullableString(decision.rubric_id)),
  ]);

  const rubricPointResults = rubricIds.map((rubricId) => {
    const decision = decisionByRubricId.get(String(rubricId)) ?? {};
    const rubricPoint = pointByRubricId.get(String(rubricId)) ?? {};
    const mapping = resolvePartMapping({
      decision,
      rubricPoint,
      requestScope,
    });

    return buildRubricPointResult({
      decision,
      rubricPoint,
      mapping,
    });
  });

  const mappedPointResults = rubricPointResults.filter((item) => item.part_id || item.subpart_id);
  const ambiguousPointResults = rubricPointResults.filter((item) =>
    item.mapping_source === 'none' || item.mapping_source === 'ambiguous');
  const groupedPartResults = new Map();

  for (const pointResult of mappedPointResults) {
    const key = `${pointResult.part_id || ''}::${pointResult.subpart_id || ''}`;
    const existing = groupedPartResults.get(key) || {
      part_id: pointResult.part_id,
      subpart_id: pointResult.subpart_id,
      mapped_question_type_refs: questionTypeId
        ? [buildQuestionTypeRef(questionTypeId)]
        : [],
      rubric_point_results: [],
      score_awarded: 0,
      score_max: 0,
      uncertain_flags: [],
      diagnostic_refs: [],
    };

    existing.rubric_point_results.push(pointResult);
    existing.score_awarded += toNumber(pointResult.awarded_marks);
    existing.score_max += toNumber(pointResult.score_max);
    existing.uncertain_flags = uniq([
      ...existing.uncertain_flags,
      ...normalizeArray(pointResult.uncertain_flags),
    ]);
    groupedPartResults.set(key, existing);
  }

  const partResults = [...groupedPartResults.values()];
  const totalAwarded = rubricPointResults.reduce(
    (sum, pointResult) => sum + toNumber(pointResult.awarded_marks),
    0,
  );
  const totalAvailable = rubricPointResults.reduce(
    (sum, pointResult) => sum + toNumber(pointResult.score_max),
    0,
  );
  const coverageScope = requestScope.subpart_id
    ? 'subpart'
    : requestScope.part_id
      ? 'part'
      : 'question';
  const localSignalOnly = coverageScope !== 'question';
  const conservativePartMapping = ambiguousPointResults.length > 0;

  return {
    attempt_id: attemptId,
    mark_run_id: markRunId,
    question_ref: questionId ? buildQuestionRef(questionId) : null,
    classification: {
      question_type_ref: questionTypeId ? buildQuestionTypeRef(questionTypeId) : null,
    },
    marking_summary: {
      total_awarded: totalAwarded,
      total_available: totalAvailable,
      coverage_scope: coverageScope,
      local_signal_only: localSignalOnly,
      part_result_count: partResults.length,
      mapped_rubric_point_result_count: mappedPointResults.length,
      ambiguous_rubric_point_result_count: ambiguousPointResults.length,
      conservative_part_mapping: conservativePartMapping,
    },
    part_results: partResults,
    diagnostics: buildDiagnostics(partResults, rubricPointResults),
    learning_hints: {
      local_signal_only: localSignalOnly,
      conservative_part_mapping: conservativePartMapping,
    },
  };
}
