function toObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

function serializeAttempt(attempt) {
  if (!attempt) {
    return {
      attempt_id: null,
      question_id: null,
      paper_id: null,
      storage_key: null,
      q_number: null,
      subpart: null,
      syllabus_code: null,
      node_id: null,
      topic_path: null,
      created_at: null,
    };
  }

  return {
    attempt_id: attempt.attempt_id ?? null,
    question_id: attempt.question_id ?? null,
    paper_id: attempt.paper_id ?? null,
    storage_key: attempt.storage_key ?? null,
    q_number: attempt.q_number ?? null,
    subpart: attempt.subpart ?? null,
    syllabus_code: attempt.syllabus_code ?? null,
    node_id: attempt.node_id ?? null,
    topic_path: attempt.topic_path ?? null,
    created_at: attempt.created_at ?? null,
  };
}

function serializeMarkDecision(markDecision) {
  if (!markDecision) {
    return {
      mark_decision_id: null,
      mark_run_id: null,
      rubric_id: null,
      mark_label: null,
      awarded: null,
      awarded_marks: null,
      reason: null,
      created_at: null,
    };
  }

  return {
    mark_decision_id: markDecision.mark_decision_id ?? null,
    mark_run_id: markDecision.mark_run_id ?? null,
    rubric_id: markDecision.rubric_id ?? null,
    mark_label: markDecision.mark_label ?? null,
    awarded: typeof markDecision.awarded === 'boolean' ? markDecision.awarded : null,
    awarded_marks: typeof markDecision.awarded_marks === 'number' ? markDecision.awarded_marks : null,
    reason: markDecision.reason ?? null,
    created_at: markDecision.created_at ?? null,
  };
}

function serializeErrorEvent(errorEvent) {
  if (!errorEvent) {
    return {
      error_event_id: null,
      attempt_id: null,
      mark_decision_id: null,
      topic_path: null,
      node_id: null,
      misconception_tag: null,
      severity: null,
      created_at: null,
    };
  }

  return {
    error_event_id: errorEvent.error_event_id ?? null,
    attempt_id: errorEvent.attempt_id ?? null,
    mark_decision_id: errorEvent.mark_decision_id ?? null,
    topic_path: errorEvent.topic_path ?? null,
    node_id: errorEvent.node_id ?? null,
    misconception_tag: errorEvent.misconception_tag ?? null,
    severity: errorEvent.severity ?? null,
    created_at: errorEvent.created_at ?? null,
  };
}

export function serializeErrorBookItem(record, enrichment = {}) {
  const metadata = toObject(record?.metadata);
  const attempt = serializeAttempt(enrichment.attempt);
  const markDecision = serializeMarkDecision(enrichment.markDecision);
  const errorEvent = serializeErrorEvent(enrichment.errorEvent);
  const topicName = record?.topic_name ?? null;
  const syllabusCode = record?.syllabus_code ?? record?.subject_code ?? attempt.syllabus_code ?? null;

  return {
    id: record?.id ?? null,
    user_id: record?.user_id ?? null,
    source: record?.source ?? 'manual',
    subject_code: record?.subject_code ?? syllabusCode,
    syllabus_code: syllabusCode,
    paper: record?.paper ?? null,
    paper_id: record?.paper_id ?? attempt.paper_id,
    q_number: record?.q_number ?? attempt.q_number,
    topic_id: record?.topic_id ?? null,
    topic_name: topicName,
    topic: {
      id: record?.topic_id ?? null,
      name: topicName,
    },
    question: record?.question ?? '',
    correct_answer: record?.correct_answer ?? null,
    user_answer: record?.user_answer ?? null,
    explanation: record?.explanation ?? null,
    error_type: record?.error_type ?? null,
    difficulty_level: record?.difficulty_level ?? null,
    tags: Array.isArray(record?.tags) ? record.tags : [],
    status: record?.status ?? 'unresolved',
    review_count: Number(record?.review_count ?? 0),
    is_starred: Boolean(record?.is_starred),
    notes: record?.notes ?? null,
    storage_key: record?.storage_key ?? attempt.storage_key,
    node_id: record?.node_id ?? attempt.node_id ?? errorEvent.node_id,
    metadata,
    created_at: record?.created_at ?? null,
    updated_at: record?.updated_at ?? null,
    enrichment: {
      attempt,
      mark_decision: markDecision,
      error_event: errorEvent,
    },
  };
}

export function serializeErrorBookList(items, meta = {}) {
  return {
    items,
    meta: {
      count: items.length,
      ...meta,
    },
  };
}

export function serializeErrorBookSingle(item) {
  return { item };
}
