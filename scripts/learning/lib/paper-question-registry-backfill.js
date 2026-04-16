function cloneJson(value, fallback = null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.parse(JSON.stringify(value))
    : fallback;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeInteger(value, fieldName) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (Number.isInteger(parsed)) {
    return parsed;
  }

  throw new Error(`${fieldName} must be an integer.`);
}

function normalizeArray(value) {
  return Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : [];
}

function normalizeObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.parse(JSON.stringify(value))
    : fallback;
}

function deriveParentTopicPath(topicPath) {
  const normalized = normalizeString(topicPath);
  if (!normalized.includes('.')) {
    return null;
  }
  return normalized.split('.').slice(0, -1).join('.');
}

function buildCurriculumNodeIdentity({
  syllabusCode,
  topicPath,
  versionTag,
} = {}) {
  return [
    normalizeString(syllabusCode),
    normalizeString(topicPath),
    normalizeString(versionTag),
  ].join('::');
}

function normalizeManifestItem(manifestItem, defaultSubjectCode, defaultVersionTag) {
  const storageKey = normalizeString(manifestItem?.storage_key);
  if (!storageKey) {
    throw new Error('Manifest item is missing storage_key.');
  }

  const syllabusCode = normalizeString(manifestItem?.syllabus_code) || normalizeString(defaultSubjectCode);
  if (!syllabusCode) {
    throw new Error(`Manifest item ${storageKey} is missing syllabus_code.`);
  }

  const primaryTopicPath = normalizeString(manifestItem?.primary_topic_path);
  if (!primaryTopicPath) {
    throw new Error(`Manifest item ${storageKey} is missing primary_topic_path.`);
  }

  return {
    storage_key: storageKey,
    syllabus_code: syllabusCode,
    year: normalizeInteger(manifestItem?.year, `${storageKey}.year`),
    session: normalizeString(manifestItem?.session),
    paper: normalizeInteger(manifestItem?.paper, `${storageKey}.paper`),
    variant: normalizeInteger(manifestItem?.variant, `${storageKey}.variant`),
    q_number: normalizeInteger(manifestItem?.q_number, `${storageKey}.q_number`),
    primary_topic_path: primaryTopicPath,
    source_reason: normalizeNullableString(manifestItem?.source_reason),
    descriptor_required: Boolean(manifestItem?.descriptor_required),
    gate_critical: Boolean(manifestItem?.gate_critical),
    requires_review: Boolean(manifestItem?.requires_review),
    audit_source: normalizeNullableString(manifestItem?.audit_source),
    audit_verdict: normalizeNullableString(manifestItem?.audit_verdict),
    curriculum_version_tag:
      normalizeString(manifestItem?.curriculum_version_tag) || normalizeString(defaultVersionTag),
  };
}

function normalizeSeedNode(node, {
  defaultSyllabusCode,
  defaultVersionTag,
  index,
} = {}) {
  const topicPath = normalizeString(node?.topic_path);
  if (!topicPath) {
    throw new Error(`curriculumSeed.nodes[${index}] is missing topic_path.`);
  }

  const syllabusCode = normalizeString(node?.syllabus_code) || normalizeString(defaultSyllabusCode);
  if (!syllabusCode) {
    throw new Error(`curriculumSeed.nodes[${index}] is missing syllabus_code.`);
  }

  const versionTag = normalizeString(node?.version_tag) || normalizeString(defaultVersionTag);
  if (!versionTag) {
    throw new Error(`curriculumSeed.nodes[${index}] is missing version_tag.`);
  }

  const title = normalizeString(node?.title);
  if (!title) {
    throw new Error(`curriculumSeed.nodes[${index}] is missing title.`);
  }

  return {
    syllabus_code: syllabusCode,
    topic_path: topicPath,
    version_tag: versionTag,
    title,
    level: normalizeNullableString(node?.level),
    paper: node?.paper === null || typeof node?.paper === 'undefined'
      ? null
      : normalizeInteger(node.paper, `${topicPath}.paper`),
    parent_topic_path:
      normalizeNullableString(node?.parent_topic_path) ?? deriveParentTopicPath(topicPath),
    sort_order:
      typeof node?.sort_order === 'undefined'
        ? index * 10
        : normalizeInteger(node.sort_order, `${topicPath}.sort_order`),
    metadata: normalizeObject(node?.metadata),
  };
}

function sortSeedNodes(nodes = []) {
  return [...nodes].sort((left, right) => (
    left.topic_path.split('.').length - right.topic_path.split('.').length
    || left.sort_order - right.sort_order
    || left.topic_path.localeCompare(right.topic_path)
  ));
}

async function maybeSingle(query, fallbackMessage) {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
  return data ?? null;
}

async function findCurriculumNode(client, {
  syllabusCode,
  topicPath,
  versionTag,
} = {}) {
  return maybeSingle(
    client
      .from('curriculum_nodes')
      .select(
        'node_id, syllabus_code, topic_path, version_tag, title, level, paper, parent_id, sort_order, metadata',
      )
      .eq('syllabus_code', syllabusCode)
      .eq('topic_path', topicPath)
      .eq('version_tag', versionTag)
      .maybeSingle(),
    `Failed to load curriculum node for ${topicPath}.`,
  );
}

async function insertCurriculumNode(client, node) {
  const { data, error } = await client
    .from('curriculum_nodes')
    .insert(node)
    .select(
      'node_id, syllabus_code, topic_path, version_tag, title, level, paper, parent_id, sort_order, metadata',
    )
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to insert curriculum node ${node.topic_path}: ${error?.message || 'no data returned'}`,
    );
  }

  return data;
}

export async function ensurePilotCurriculumNodes(client, {
  curriculumSeed = null,
  manifest = null,
  dryRun = false,
} = {}) {
  const defaultSyllabusCode =
    normalizeString(curriculumSeed?.syllabus_code)
    || normalizeString(manifest?.subject_code);
  const defaultVersionTag =
    normalizeString(curriculumSeed?.version_tag)
    || normalizeString(manifest?.curriculum_version_tag)
    || '2025-2027_v1';

  const normalizedNodes = sortSeedNodes(
    normalizeArray(curriculumSeed?.nodes).map((node, index) => normalizeSeedNode(node, {
      defaultSyllabusCode,
      defaultVersionTag,
      index,
    })),
  );

  const topicNodesByIdentity = new Map();
  let inserted = 0;
  let existing = 0;

  for (const node of normalizedNodes) {
    const nodeIdentity = buildCurriculumNodeIdentity({
      syllabusCode: node.syllabus_code,
      topicPath: node.topic_path,
      versionTag: node.version_tag,
    });
    const found = await findCurriculumNode(client, {
      syllabusCode: node.syllabus_code,
      topicPath: node.topic_path,
      versionTag: node.version_tag,
    });

    if (found) {
      topicNodesByIdentity.set(nodeIdentity, found);
      existing += 1;
      continue;
    }

    const parentId = node.parent_topic_path
      ? topicNodesByIdentity.get(buildCurriculumNodeIdentity({
        syllabusCode: node.syllabus_code,
        topicPath: node.parent_topic_path,
        versionTag: node.version_tag,
      }))?.node_id ?? null
      : null;

    if (dryRun) {
      topicNodesByIdentity.set(nodeIdentity, {
        ...node,
        node_id: null,
        parent_id: parentId,
      });
      inserted += 1;
      continue;
    }

    const insertedNode = await insertCurriculumNode(client, {
      syllabus_code: node.syllabus_code,
      topic_path: node.topic_path,
      title: node.title,
      level: node.level,
      paper: node.paper,
      version_tag: node.version_tag,
      parent_id: parentId,
      sort_order: node.sort_order,
      metadata: node.metadata,
    });

    topicNodesByIdentity.set(nodeIdentity, insertedNode);
    inserted += 1;
  }

  return {
    inserted,
    existing,
    topicNodesByIdentity,
  };
}

async function findDescriptorRow(client, {
  storageKey,
  qNumber,
} = {}) {
  const { data, error } = await client
    .from('question_descriptions_v0')
    .select(
      'id, storage_key, q_number, status, summary, year, session, paper, variant, updated_at, extractor_version, provider, model, prompt_version',
    )
    .eq('storage_key', storageKey)
    .eq('q_number', qNumber)
    .eq('status', 'ok')
    .order('updated_at', { ascending: false })
    .order('extractor_version', { ascending: false })
    .order('provider', { ascending: false })
    .order('model', { ascending: false })
    .order('prompt_version', { ascending: false })
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message || `Failed to load descriptor row for ${storageKey}#${qNumber}.`);
  }

  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function findQuestionBankRow(client, {
  storageKey,
  qNumber,
} = {}) {
  return maybeSingle(
    client
      .from('question_bank')
      .select(
        'question_id, source_kind, subject_code, storage_key, q_number, paper_scope, primary_topic_id, secondary_topic_ids, family_id, primary_question_type_id, secondary_question_type_ids, variant_tags, release_scope_status, prompt_representation, provenance_summary, classification_snapshot_ref',
      )
      .eq('storage_key', storageKey)
      .eq('q_number', qNumber)
      .maybeSingle(),
    `Failed to load question_bank row for ${storageKey}#${qNumber}.`,
  );
}

export function buildPaperQuestionPromptRepresentation({
  existingQuestion = null,
  descriptorRow = null,
} = {}) {
  const descriptorSummary = normalizeString(descriptorRow?.summary);
  if (descriptorSummary) {
    return {
      promptRepresentation: {
        type: 'text',
        value: descriptorSummary,
      },
      promptSource: 'question_descriptions_v0',
    };
  }

  const existingPrompt = cloneJson(existingQuestion?.prompt_representation);
  if (existingPrompt?.type && existingPrompt?.value) {
    return {
      promptRepresentation: existingPrompt,
      promptSource: 'existing_prompt_representation',
    };
  }

  return {
    promptRepresentation: null,
    promptSource: 'missing',
  };
}

function buildPaperScope(manifestItem) {
  return {
    syllabus_code: manifestItem.syllabus_code,
    year: manifestItem.year,
    session: manifestItem.session,
    paper: manifestItem.paper,
    variant: manifestItem.variant,
    q_number: manifestItem.q_number,
    storage_key: manifestItem.storage_key,
  };
}

function buildProvenanceSummary({
  manifest,
  manifestItem,
  descriptorRow,
  existingQuestion,
  promptSource,
} = {}) {
  const descriptorSummaryPresent = normalizeString(descriptorRow?.summary).length > 0;
  const provenanceSummary = {
    ...normalizeObject(existingQuestion?.provenance_summary),
    storage_key: manifestItem.storage_key,
    q_number: manifestItem.q_number,
    source_kind: 'paper_question',
    manifest_id: normalizeNullableString(manifest?.manifest_id),
    source_reason: manifestItem.source_reason,
    primary_topic_path: manifestItem.primary_topic_path,
    descriptor_required: manifestItem.descriptor_required,
    descriptor_summary_status: descriptorSummaryPresent
      ? 'hydrated_from_question_descriptions_v0'
      : 'descriptor_missing_or_empty',
    prompt_representation_source: promptSource,
    gate_critical: manifestItem.gate_critical,
    requires_review: manifestItem.requires_review,
    audit_source: manifestItem.audit_source,
    audit_verdict: manifestItem.audit_verdict,
  };

  if (descriptorSummaryPresent) {
    provenanceSummary.title = normalizeString(descriptorRow.summary);
  }

  return provenanceSummary;
}

function buildPaperQuestionRow({
  manifest,
  manifestItem,
  descriptorRow,
  existingQuestion,
  primaryTopicId,
} = {}) {
  const { promptRepresentation, promptSource } = buildPaperQuestionPromptRepresentation({
    existingQuestion,
    descriptorRow,
  });

  return {
    row: {
      source_kind: 'paper_question',
      subject_code: manifestItem.syllabus_code,
      storage_key: manifestItem.storage_key,
      q_number: manifestItem.q_number,
      paper_scope: buildPaperScope(manifestItem),
      primary_topic_id: primaryTopicId,
      secondary_topic_ids: normalizeArray(existingQuestion?.secondary_topic_ids),
      family_id: existingQuestion?.family_id ?? null,
      primary_question_type_id: existingQuestion?.primary_question_type_id ?? null,
      secondary_question_type_ids: normalizeArray(existingQuestion?.secondary_question_type_ids),
      variant_tags: normalizeArray(existingQuestion?.variant_tags),
      release_scope_status: existingQuestion?.release_scope_status ?? 'non_released_fallback',
      prompt_representation: promptRepresentation,
      provenance_summary: buildProvenanceSummary({
        manifest,
        manifestItem,
        descriptorRow,
        existingQuestion,
        promptSource,
      }),
    },
    promptSource,
  };
}

async function insertPaperQuestionRow(client, row) {
  const { error } = await client
    .from('question_bank')
    .insert(row);

  if (error) {
    throw new Error(
      `Failed to insert paper-backed question ${row.storage_key}#${row.q_number}: ${error.message}`,
    );
  }
}

async function updatePaperQuestionRow(client, row) {
  const { error } = await client
    .from('question_bank')
    .update(row)
    .eq('storage_key', row.storage_key)
    .eq('q_number', row.q_number);

  if (error) {
    throw new Error(
      `Failed to update paper-backed question ${row.storage_key}#${row.q_number}: ${error.message}`,
    );
  }
}

export async function runPaperQuestionRegistryBackfill(client, {
  manifest = null,
  curriculumSeed = null,
  dryRun = false,
} = {}) {
  if (!client || typeof client.from !== 'function') {
    throw new Error('A Supabase-compatible client is required.');
  }

  const normalizedItems = normalizeArray(manifest?.items).map((manifestItem) => normalizeManifestItem(
    manifestItem,
    manifest?.subject_code,
    manifest?.curriculum_version_tag,
  ));

  if (normalizedItems.length === 0) {
    throw new Error('Manifest must contain at least one item.');
  }

  const curriculumNodes = await ensurePilotCurriculumNodes(client, {
    curriculumSeed,
    manifest,
    dryRun,
  });

  const preview = [];
  let processed = 0;
  let inserted = 0;
  let updated = 0;
  let conflicts = 0;

  for (const manifestItem of normalizedItems) {
    const descriptorRow = await findDescriptorRow(client, {
      storageKey: manifestItem.storage_key,
      qNumber: manifestItem.q_number,
    });
    const existingQuestion = await findQuestionBankRow(client, {
      storageKey: manifestItem.storage_key,
      qNumber: manifestItem.q_number,
    });

    if (existingQuestion?.source_kind === 'imported_question') {
      conflicts += 1;
      preview.push({
        storage_key: manifestItem.storage_key,
        q_number: manifestItem.q_number,
        action: 'conflict_imported_question',
      });
      continue;
    }

    const topicNodeIdentity = buildCurriculumNodeIdentity({
      syllabusCode: manifestItem.syllabus_code,
      topicPath: manifestItem.primary_topic_path,
      versionTag: manifestItem.curriculum_version_tag,
    });
    const topicNode = curriculumNodes.topicNodesByIdentity.get(topicNodeIdentity)
      ?? await findCurriculumNode(client, {
        syllabusCode: manifestItem.syllabus_code,
        topicPath: manifestItem.primary_topic_path,
        versionTag: manifestItem.curriculum_version_tag,
      });

    if (!topicNode && !dryRun) {
      throw new Error(
        `Failed to resolve curriculum node for ${manifestItem.primary_topic_path}.`,
      );
    }

    const { row, promptSource } = buildPaperQuestionRow({
      manifest,
      manifestItem,
      descriptorRow,
      existingQuestion,
      primaryTopicId: topicNode?.node_id ?? null,
    });

    const action = existingQuestion ? 'update' : 'insert';
    preview.push({
      storage_key: manifestItem.storage_key,
      q_number: manifestItem.q_number,
      action,
      primary_topic_id: row.primary_topic_id ?? null,
      prompt_representation_source: promptSource,
      source_kind: row.source_kind,
    });

    if (!dryRun) {
      if (existingQuestion) {
        await updatePaperQuestionRow(client, row);
      } else {
        await insertPaperQuestionRow(client, row);
      }
    }

    processed += 1;
    if (existingQuestion) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  return {
    processed,
    inserted,
    updated,
    conflicts,
    dryRun: Boolean(dryRun),
    curriculumNodes: {
      inserted: curriculumNodes.inserted,
      existing: curriculumNodes.existing,
    },
    preview,
  };
}
