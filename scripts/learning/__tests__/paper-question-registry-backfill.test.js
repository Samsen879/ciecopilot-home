import { runPaperQuestionRegistryBackfill } from '../lib/paper-question-registry-backfill.js';

function buildManifest(items = []) {
  return {
    schema_version: 'v1',
    manifest_id: '9709_question_search_recovery_v1',
    subject_code: '9709',
    curriculum_version_tag: '2025-2027_v1',
    items,
  };
}

function buildCurriculumSeed(nodes = []) {
  return {
    schema_version: 'v1',
    seed_id: '9709_question_search_recovery_nodes_v1',
    syllabus_code: '9709',
    version_tag: '2025-2027_v1',
    nodes,
  };
}

function createBackfillClient({
  curriculumNodes = [],
  questionBankRows = [],
  descriptorRows = [],
} = {}) {
  const state = {
    nextNodeId: 1,
    nextQuestionId: 1,
    curriculumNodes: new Map(),
    questionBankRows: new Map(),
    descriptorRows: new Map(),
  };

  for (const node of curriculumNodes) {
    const key = `${node.syllabus_code}::${node.topic_path}::${node.version_tag}`;
    state.curriculumNodes.set(key, {
      node_id: node.node_id,
      syllabus_code: node.syllabus_code,
      topic_path: node.topic_path,
      version_tag: node.version_tag,
      title: node.title ?? node.topic_path,
      level: node.level ?? null,
      paper: node.paper ?? null,
      parent_id: node.parent_id ?? null,
      sort_order: node.sort_order ?? 0,
      metadata: node.metadata ?? {},
    });
  }

  for (const row of questionBankRows) {
    const key = `${row.storage_key ?? 'null'}::${row.q_number ?? 'null'}`;
    state.questionBankRows.set(key, {
      question_id: row.question_id,
      source_kind: row.source_kind,
      subject_code: row.subject_code ?? null,
      storage_key: row.storage_key ?? null,
      q_number: row.q_number ?? null,
      paper_scope: row.paper_scope ?? null,
      primary_topic_id: row.primary_topic_id ?? null,
      secondary_topic_ids: row.secondary_topic_ids ?? [],
      family_id: row.family_id ?? null,
      primary_question_type_id: row.primary_question_type_id ?? null,
      secondary_question_type_ids: row.secondary_question_type_ids ?? [],
      variant_tags: row.variant_tags ?? [],
      release_scope_status: row.release_scope_status ?? null,
      prompt_representation: row.prompt_representation ?? null,
      provenance_summary: row.provenance_summary ?? {},
      classification_snapshot_ref: row.classification_snapshot_ref ?? null,
    });
  }

  for (const row of descriptorRows) {
    const key = `${row.storage_key}::${row.q_number}`;
    state.descriptorRows.set(key, {
      storage_key: row.storage_key,
      q_number: row.q_number,
      status: row.status ?? 'ok',
      summary: row.summary ?? null,
      year: row.year ?? null,
      session: row.session ?? null,
      paper: row.paper ?? null,
      variant: row.variant ?? null,
    });
  }

  function findFilter(filters, field) {
    return filters.find((filter) => filter.field === field)?.value ?? null;
  }

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.operation = 'select';
      this.payload = null;
      this.filters = [];
    }

    select() {
      return this;
    }

    insert(payload) {
      this.operation = 'insert';
      this.payload = payload;
      return this;
    }

    update(payload) {
      this.operation = 'update';
      this.payload = payload;
      return this;
    }

    eq(field, value) {
      this.filters.push({ field, value });
      return this;
    }

    single() {
      return this.#resolve('single');
    }

    maybeSingle() {
      return this.#resolve('maybeSingle');
    }

    then(resolve, reject) {
      return this.#resolve().then(resolve, reject);
    }

    #resolve(singleMode = null) {
      if (this.table === 'curriculum_nodes' && this.operation === 'select') {
        const syllabusCode = findFilter(this.filters, 'syllabus_code');
        const topicPath = findFilter(this.filters, 'topic_path');
        const versionTag = findFilter(this.filters, 'version_tag');
        const key = `${syllabusCode}::${topicPath}::${versionTag}`;
        return Promise.resolve({ data: state.curriculumNodes.get(key) ?? null, error: null });
      }

      if (this.table === 'curriculum_nodes' && this.operation === 'insert') {
        const nodeId = this.payload.node_id ?? `node-${state.nextNodeId++}`;
        const row = {
          node_id: nodeId,
          ...this.payload,
        };
        const key = `${row.syllabus_code}::${row.topic_path}::${row.version_tag}`;
        state.curriculumNodes.set(key, row);
        return Promise.resolve({ data: row, error: null });
      }

      if (this.table === 'question_descriptions_v0' && this.operation === 'select') {
        const storageKey = findFilter(this.filters, 'storage_key');
        const qNumber = findFilter(this.filters, 'q_number');
        const status = findFilter(this.filters, 'status');
        const row = state.descriptorRows.get(`${storageKey}::${qNumber}`) ?? null;
        if (row && status && row.status !== status) {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: row, error: null });
      }

      if (this.table === 'question_bank' && this.operation === 'select') {
        const storageKey = findFilter(this.filters, 'storage_key');
        const qNumber = findFilter(this.filters, 'q_number');
        const row = state.questionBankRows.get(`${storageKey ?? 'null'}::${qNumber ?? 'null'}`) ?? null;
        return Promise.resolve({ data: row, error: null });
      }

      if (this.table === 'question_bank' && this.operation === 'insert') {
        const questionId = this.payload.question_id ?? `question-${state.nextQuestionId++}`;
        const row = {
          question_id: questionId,
          secondary_topic_ids: [],
          secondary_question_type_ids: [],
          variant_tags: [],
          provenance_summary: {},
          classification_snapshot_ref: null,
          ...this.payload,
        };
        const key = `${row.storage_key ?? 'null'}::${row.q_number ?? 'null'}`;
        state.questionBankRows.set(key, row);
        return Promise.resolve({ data: row, error: null });
      }

      if (this.table === 'question_bank' && this.operation === 'update') {
        const storageKey = findFilter(this.filters, 'storage_key');
        const qNumber = findFilter(this.filters, 'q_number');
        const key = `${storageKey ?? 'null'}::${qNumber ?? 'null'}`;
        const current = state.questionBankRows.get(key);

        if (!current) {
          return Promise.resolve({
            data: null,
            error: { message: `Question row not found for ${key}` },
          });
        }

        const row = {
          ...current,
          ...this.payload,
        };
        state.questionBankRows.set(key, row);
        return Promise.resolve({ data: row, error: null });
      }

      if (singleMode === 'single') {
        return Promise.resolve({
          data: null,
          error: { message: `Unhandled query builder path for ${this.table}` },
        });
      }

      return Promise.resolve({ data: [], error: null });
    }
  }

  return {
    state,
    client: {
      from(table) {
        return new QueryBuilder(table);
      },
    },
  };
}

describe('paper-question registry backfill', () => {
  test('upserts manifest-backed paper_question rows without rewriting unrelated imported-question history', async () => {
    const { client, state } = createBackfillClient({
      curriculumNodes: [
        {
          node_id: 'topic-trig',
          syllabus_code: '9709',
          topic_path: '9709.p1.trigonometry',
          version_tag: '2025-2027_v1',
        },
      ],
      questionBankRows: [
        {
          question_id: 'imported-1',
          source_kind: 'imported_question',
          subject_code: '9709',
          storage_key: null,
          q_number: null,
          prompt_representation: {
            type: 'text',
            value: 'Legacy imported question should remain intact.',
          },
        },
      ],
    });

    const summary = await runPaperQuestionRegistryBackfill(client, {
      manifest: buildManifest([
        {
          storage_key: '9709/s19_qp_11/questions/q06.png',
          syllabus_code: '9709',
          year: 2019,
          session: 's',
          paper: 1,
          variant: 1,
          q_number: 6,
          primary_topic_path: '9709.p1.trigonometry',
          source_reason: 'gate_pin',
          descriptor_required: true,
          gate_critical: true,
        },
      ]),
      curriculumSeed: buildCurriculumSeed([
        {
          topic_path: '9709',
          title: '9709 Mathematics',
          level: 'syllabus',
          parent_topic_path: null,
          sort_order: 0,
        },
        {
          topic_path: '9709.p1',
          title: 'Pure Mathematics 1',
          level: 'paper',
          paper: 1,
          parent_topic_path: '9709',
          sort_order: 100,
        },
        {
          topic_path: '9709.p1.trigonometry',
          title: 'Trigonometry',
          level: 'topic',
          paper: 1,
          parent_topic_path: '9709.p1',
          sort_order: 150,
        },
      ]),
    });

    expect(summary).toMatchObject({
      processed: 1,
      inserted: 1,
      updated: 0,
      conflicts: 0,
    });

    expect(state.questionBankRows.get('9709/s19_qp_11/questions/q06.png::6')).toMatchObject({
      source_kind: 'paper_question',
      subject_code: '9709',
      storage_key: '9709/s19_qp_11/questions/q06.png',
      q_number: 6,
      primary_topic_id: 'topic-trig',
      release_scope_status: 'non_released_fallback',
      paper_scope: {
        syllabus_code: '9709',
        year: 2019,
        session: 's',
        paper: 1,
        variant: 1,
        q_number: 6,
        storage_key: '9709/s19_qp_11/questions/q06.png',
      },
      provenance_summary: expect.objectContaining({
        source_kind: 'paper_question',
        manifest_id: '9709_question_search_recovery_v1',
        source_reason: 'gate_pin',
      }),
    });

    expect(state.questionBankRows.get('null::null')).toMatchObject({
      question_id: 'imported-1',
      source_kind: 'imported_question',
      prompt_representation: {
        type: 'text',
        value: 'Legacy imported question should remain intact.',
      },
    });
  });

  test('hydrates prompt_representation from descriptor summaries for manifest-backed paper_question rows', async () => {
    const { client, state } = createBackfillClient({
      curriculumNodes: [
        {
          node_id: 'topic-int',
          syllabus_code: '9709',
          topic_path: '9709.p3.integration',
          version_tag: '2025-2027_v1',
        },
      ],
      descriptorRows: [
        {
          storage_key: '9709/s16_qp_33/questions/q07.png',
          q_number: 7,
          status: 'ok',
          summary: 'Evaluate the integral by using the stated substitution.',
          year: 2016,
          session: 's',
          paper: 3,
          variant: 3,
        },
      ],
    });

    await runPaperQuestionRegistryBackfill(client, {
      manifest: buildManifest([
        {
          storage_key: '9709/s16_qp_33/questions/q07.png',
          syllabus_code: '9709',
          year: 2016,
          session: 's',
          paper: 3,
          variant: 3,
          q_number: 7,
          primary_topic_path: '9709.p3.integration',
          source_reason: 'gate_pin',
          descriptor_required: true,
        },
      ]),
      curriculumSeed: buildCurriculumSeed([]),
    });

    expect(state.questionBankRows.get('9709/s16_qp_33/questions/q07.png::7')).toMatchObject({
      prompt_representation: {
        type: 'text',
        value: 'Evaluate the integral by using the stated substitution.',
      },
      provenance_summary: expect.objectContaining({
        descriptor_summary_status: 'hydrated_from_question_descriptions_v0',
      }),
    });
  });

  test('seeds missing pilot curriculum nodes and resolves primary_topic_id deterministically from primary_topic_path', async () => {
    const { client, state } = createBackfillClient();

    const summary = await runPaperQuestionRegistryBackfill(client, {
      manifest: buildManifest([
        {
          storage_key: '9709/s21_qp_31/questions/q03.png',
          syllabus_code: '9709',
          year: 2021,
          session: 's',
          paper: 3,
          variant: 1,
          q_number: 3,
          primary_topic_path: '9709.p3.trigonometry',
          source_reason: 'manual_audit_seed',
          descriptor_required: true,
        },
      ]),
      curriculumSeed: buildCurriculumSeed([
        {
          topic_path: '9709',
          title: '9709 Mathematics',
          level: 'syllabus',
          parent_topic_path: null,
          sort_order: 0,
        },
        {
          topic_path: '9709.p3',
          title: 'Pure Mathematics 3',
          level: 'paper',
          paper: 3,
          parent_topic_path: '9709',
          sort_order: 300,
        },
        {
          topic_path: '9709.p3.trigonometry',
          title: 'Trigonometry',
          level: 'topic',
          paper: 3,
          parent_topic_path: '9709.p3',
          sort_order: 330,
        },
      ]),
    });

    expect(summary.curriculumNodes).toMatchObject({
      inserted: 3,
      existing: 0,
    });

    const insertedTopic = state.curriculumNodes.get(
      '9709::9709.p3.trigonometry::2025-2027_v1',
    );
    expect(insertedTopic).toMatchObject({
      topic_path: '9709.p3.trigonometry',
      parent_id: expect.any(String),
    });

    expect(state.questionBankRows.get('9709/s21_qp_31/questions/q03.png::3')).toMatchObject({
      primary_topic_id: insertedTopic.node_id,
    });
  });
});
