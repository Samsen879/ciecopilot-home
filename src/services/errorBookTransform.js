function toDateOnly(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().split('T')[0];
}

function normalizeTopic(record) {
  if (record?.topic && typeof record.topic === 'object' && !Array.isArray(record.topic)) {
    return record.topic;
  }

  return {
    id: record?.topic_id ?? null,
    name: record?.topic_name ?? null,
  };
}

function normalizeMetadata(record) {
  if (!record?.metadata || typeof record.metadata !== 'object' || Array.isArray(record.metadata)) {
    return {};
  }

  return record.metadata;
}

function normalizePaper(record) {
  if (record?.paper !== null && record?.paper !== undefined && record?.paper !== '') {
    const numericPaper = Number(record.paper);
    if (Number.isInteger(numericPaper) && numericPaper > 0) {
      return `Paper ${numericPaper}`;
    }
    return String(record.paper);
  }

  if (record?.paper_id) {
    return record.paper_id;
  }

  return 'Unknown Paper';
}

export function transformErrorBookRecord(record = {}) {
  const topic = normalizeTopic(record);
  const enrichment = record?.enrichment && typeof record.enrichment === 'object' && !Array.isArray(record.enrichment)
    ? record.enrichment
    : {};

  return {
    id: record.id ?? null,
    subject: record.syllabus_code || record.subject_code || 'unknown',
    paper: normalizePaper(record),
    topic: topic.name || 'Unknown Topic',
    topicId: topic.id || null,
    question: record.question || '',
    userAnswer: record.user_answer || null,
    correctAnswer: record.correct_answer || null,
    explanation: record.explanation || null,
    errorType: record.error_type || '未分类',
    difficulty: record.difficulty_level || 'medium',
    tags: Array.isArray(record.tags) ? record.tags : [],
    status: record.status || 'unresolved',
    createdAt: toDateOnly(record.created_at),
    reviewCount: Number(record.review_count || 0),
    isStarred: Boolean(record.is_starred),
    notes: record.notes || '',
    storageKey: record.storage_key || enrichment?.attempt?.storage_key || null,
    nodeId: record.node_id || enrichment?.attempt?.node_id || enrichment?.error_event?.node_id || null,
    source: record.source || 'manual',
    metadata: normalizeMetadata(record),
    enrichment,
  };
}
