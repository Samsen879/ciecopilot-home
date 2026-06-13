import {
  createArtifactContentRepository,
} from '../lib/repositories/artifact-content-repository.js';

function createArtifactContentDb() {
  const versions = new Map();
  let nextVersionId = 1;
  let nextInsertError = null;

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function listVersions(filters = []) {
    let rows = [...versions.values()];

    for (const filter of filters) {
      if (filter.type === 'eq') {
        rows = rows.filter((row) => row[filter.column] === filter.value);
      }
    }

    return rows;
  }

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.operation = 'select';
      this.payload = null;
      this.filters = [];
      this.orders = [];
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

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    order(column, options = {}) {
      this.orders.push({ column, options });
      return this;
    }

    single() {
      return this.#resolve({ single: true });
    }

    maybeSingle() {
      return this.#resolve({ maybeSingle: true });
    }

    then(resolve, reject) {
      return this.#resolve({}).then(resolve, reject);
    }

    #resolve(extra = {}) {
      if (this.table !== 'learning_artifact_content_versions') {
        return Promise.reject(new Error(`Unexpected table: ${this.table}`));
      }

      if (this.operation === 'insert') {
        if (nextInsertError) {
          const error = nextInsertError;
          nextInsertError = null;
          return Promise.resolve({ data: null, error });
        }

        const row = {
          artifact_content_version_id: `artifact-content-version-${nextVersionId++}`,
          created_at: this.payload.created_at ?? '2026-04-17T12:00:00.000Z',
          ...clone(this.payload),
        };
        versions.set(row.artifact_content_version_id, row);
        return Promise.resolve({ data: clone(row), error: null });
      }

      if (this.operation === 'update') {
        const rows = listVersions(this.filters);
        const current = rows[0] ?? null;
        const next = current ? { ...current, ...clone(this.payload) } : null;
        if (next) {
          versions.set(next.artifact_content_version_id, next);
        }
        return Promise.resolve({ data: clone(next), error: null });
      }

      let rows = listVersions(this.filters);

      for (const order of this.orders) {
        rows = rows.sort((left, right) => {
          const leftValue = left[order.column];
          const rightValue = right[order.column];
          const direction = order.options?.ascending === false ? -1 : 1;

          if (leftValue === rightValue) {
            return 0;
          }

          return leftValue > rightValue ? direction : -direction;
        });
      }

      if (extra.single || extra.maybeSingle) {
        return Promise.resolve({ data: clone(rows[0] ?? null), error: null });
      }

      return Promise.resolve({ data: clone(rows), error: null });
    }
  }

  return {
    setNextInsertError(error) {
      nextInsertError = error;
    },
    async rpc(name, params) {
      if (name !== 'create_learning_artifact_content_version') {
        throw new Error(`Unexpected rpc: ${name}`);
      }

      if (nextInsertError) {
        const error = nextInsertError;
        nextInsertError = null;
        return { data: null, error };
      }

      const current = listVersions([
        { type: 'eq', column: 'artifact_id', value: params.p_artifact_id },
        { type: 'eq', column: 'is_current', value: true },
      ])[0] ?? null;

      if (params.p_is_current ?? true) {
        if (current) {
          versions.set(current.artifact_content_version_id, {
            ...current,
            is_current: false,
          });
        }
      }

      const row = {
        artifact_content_version_id: `artifact-content-version-${nextVersionId++}`,
        artifact_id: params.p_artifact_id,
        version_number: params.p_version_number,
        lineage_parent_version_id: params.p_lineage_parent_version_id,
        is_current: params.p_is_current,
        title: params.p_title,
        summary: params.p_summary,
        body_markdown: params.p_body_markdown,
        content_format: params.p_content_format,
        render_payload: params.p_render_payload,
        materialization_kind: params.p_materialization_kind,
        source_refs: params.p_source_refs,
        created_at: params.p_created_at ?? '2026-04-17T12:00:00.000Z',
      };
      versions.set(row.artifact_content_version_id, clone(row));
      return { data: clone(row), error: null };
    },
    snapshot() {
      return new Map(versions);
    },
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

describe('artifact-content-repository', () => {
  test('persists the first content version as the stable current version for an artifact', async () => {
    const db = createArtifactContentDb();
    const repository = createArtifactContentRepository(db);

    const stored = await repository.createArtifactContentVersion({
      artifact_id: 'artifact-1',
      title: 'Common trap: sign slip',
      summary: 'Watch for sign changes when rearranging terms.',
      body_markdown: '## Why this happens\n\nSigns flip when terms move across the equals sign.',
      content_format: 'markdown',
      render_payload: {
        schema_version: 'learning_artifact_render.v1',
      },
      materialization_kind: 'runtime_candidate',
      source_refs: [
        { kind: 'attempt', attempt_id: 'attempt-1' },
      ],
    });

    expect(stored).toMatchObject({
      artifact_id: 'artifact-1',
      version_number: 1,
      is_current: true,
      lineage_parent_version_id: null,
      title: 'Common trap: sign slip',
      content_format: 'markdown',
      materialization_kind: 'runtime_candidate',
    });

    await expect(repository.getCurrentArtifactContentByArtifactId('artifact-1')).resolves.toMatchObject({
      artifact_content_version_id: stored.artifact_content_version_id,
      version_number: 1,
      is_current: true,
      title: 'Common trap: sign slip',
    });
  });

  test('normalizes verified MVP visual reasoning objects before persistence', async () => {
    const db = createArtifactContentDb();
    const repository = createArtifactContentRepository(db);

    const stored = await repository.createArtifactContentVersion({
      artifact_id: 'artifact-visual-1',
      title: 'Core derivation: trig equation',
      body_markdown: 'Step 1. Expand the identity.\nStep 2. Solve the bounded equation.',
      render_payload: {
        schema_version: 'learning_artifact_render.v1',
        visual_reasoning: {
          schema_version: 'visual_reasoning_mvp.v1',
          visual_objects: [
            {
              kind: 'derivation_tree',
              source_posture: 'verified',
              confidence: 'high',
              source_refs: [{ kind: 'mark_run', mark_run_id: 'mark-run-visual-1' }],
              nodes: [
                { id: 'start', label: '2cos(2x)-3sin(x)=0' },
                { id: 'expanded', label: 'Use cos(2x)=1-2sin^2(x)' },
              ],
              edges: [
                { from: 'start', to: 'expanded', relation: 'uses_identity' },
              ],
              decorative_theme: 'aurora',
              geometry: { x: 120, y: 80 },
            },
            {
              kind: 'step_reveal_timeline',
              source_posture: 'structure_bounded',
              confidence: 'medium',
              source_refs: [{ kind: 'attempt', attempt_id: 'attempt-visual-1' }],
              steps: [
                {
                  step_id: 'expand',
                  title: 'Expand',
                  body: 'Substitute the double-angle identity.',
                  reveal_index: 1,
                },
                {
                  step_id: 'factor',
                  title: 'Factor',
                  body: 'Collect terms as a quadratic in sin(x).',
                  reveal_index: 2,
                  depends_on_step_ids: ['expand'],
                },
              ],
            },
            {
              kind: 'dependency_graph',
              source_posture: 'verified',
              confidence: 'high',
              source_refs: [{ kind: 'artifact', artifact_id: 'artifact-source-1' }],
              nodes: [
                { id: 'identity', label: 'Double-angle identity' },
                { id: 'quadratic', label: 'Quadratic solving' },
              ],
              edges: [
                { from: 'identity', to: 'quadratic', relation: 'precedes' },
              ],
            },
          ],
        },
      },
    });

    expect(stored.render_payload.visual_reasoning.visual_objects).toEqual([
      {
        kind: 'derivation_tree',
        source_posture: 'verified',
        confidence: 'high',
        source_refs: [{ kind: 'mark_run', mark_run_id: 'mark-run-visual-1' }],
        nodes: [
          { id: 'start', label: '2cos(2x)-3sin(x)=0', source_refs: [] },
          { id: 'expanded', label: 'Use cos(2x)=1-2sin^2(x)', source_refs: [] },
        ],
        edges: [
          { from: 'start', to: 'expanded', relation: 'uses_identity', source_refs: [] },
        ],
      },
      {
        kind: 'step_reveal_timeline',
        source_posture: 'structure_bounded',
        confidence: 'medium',
        source_refs: [{ kind: 'attempt', attempt_id: 'attempt-visual-1' }],
        steps: [
          {
            step_id: 'expand',
            title: 'Expand',
            body: 'Substitute the double-angle identity.',
            reveal_index: 1,
            depends_on_step_ids: [],
            source_refs: [],
          },
          {
            step_id: 'factor',
            title: 'Factor',
            body: 'Collect terms as a quadratic in sin(x).',
            reveal_index: 2,
            depends_on_step_ids: ['expand'],
            source_refs: [],
          },
        ],
      },
      {
        kind: 'dependency_graph',
        source_posture: 'verified',
        confidence: 'high',
        source_refs: [{ kind: 'artifact', artifact_id: 'artifact-source-1' }],
        nodes: [
          { id: 'identity', label: 'Double-angle identity', source_refs: [] },
          { id: 'quadratic', label: 'Quadratic solving', source_refs: [] },
        ],
        edges: [
          { from: 'identity', to: 'quadratic', relation: 'precedes', source_refs: [] },
        ],
      },
    ]);
    expect(JSON.stringify(stored.render_payload)).not.toContain('decorative_theme');
    expect(JSON.stringify(stored.render_payload)).not.toContain('geometry');
  });

  test('downgrades low-confidence visual reasoning to a step list fallback', async () => {
    const db = createArtifactContentDb();
    const repository = createArtifactContentRepository(db);

    const stored = await repository.createArtifactContentVersion({
      artifact_id: 'artifact-visual-low-confidence',
      title: 'Core derivation: low confidence',
      render_payload: {
        schema_version: 'learning_artifact_render.v1',
        visual_reasoning: {
          schema_version: 'visual_reasoning_mvp.v1',
          visual_objects: [
            {
              kind: 'step_reveal_timeline',
              source_posture: 'verified',
              confidence: 'low',
              source_refs: [{ kind: 'attempt', attempt_id: 'attempt-low-confidence' }],
              steps: [
                {
                  step_id: 'first',
                  title: 'First safe step',
                  body: 'Start from the verified equation.',
                  reveal_index: 1,
                },
              ],
            },
          ],
        },
      },
    });

    expect(stored.render_payload.visual_reasoning).toMatchObject({
      schema_version: 'visual_reasoning_mvp.v1',
      visual_objects: [],
      step_list: {
        kind: 'step_list',
        fallback_from: 'step_reveal_timeline',
        fallback_reason_code: 'low_confidence',
        source_posture: 'verified',
        confidence: 'low',
        steps: [
          {
            step_id: 'first',
            title: 'First safe step',
            body: 'Start from the verified equation.',
            source_refs: [],
          },
        ],
      },
    });
  });

  test('downgrades unbounded or unsupported visual reasoning to a step list fallback', async () => {
    const db = createArtifactContentDb();
    const repository = createArtifactContentRepository(db);

    const stored = await repository.createArtifactContentVersion({
      artifact_id: 'artifact-visual-unbounded',
      title: 'Generated sketch should not persist as learning truth',
      render_payload: {
        schema_version: 'learning_artifact_render.v1',
        visual_reasoning: {
          visual_objects: [
            {
              kind: 'vector_schematic',
              source_posture: 'generated',
              confidence: 'high',
              source_refs: [],
              steps: [
                { step_id: 'fallback', body: 'Use the text derivation instead.' },
              ],
              svg_path: 'M0 0 L10 10',
            },
          ],
        },
      },
    });

    expect(stored.render_payload.visual_reasoning.visual_objects).toEqual([]);
    expect(stored.render_payload.visual_reasoning.step_list).toEqual({
      kind: 'step_list',
      fallback_from: 'vector_schematic',
      fallback_reason_code: 'unsupported_visual_kind',
      source_posture: 'generated',
      confidence: 'high',
      source_refs: [],
      steps: [
        {
          step_id: 'fallback',
          title: null,
          body: 'Use the text derivation instead.',
          source_refs: [],
        },
      ],
    });
    expect(JSON.stringify(stored.render_payload)).not.toContain('svg_path');
  });

  test('promotes a new current version while preserving historical lineage for prior versions', async () => {
    const db = createArtifactContentDb();
    const repository = createArtifactContentRepository(db);

    const first = await repository.createArtifactContentVersion({
      artifact_id: 'artifact-1',
      title: 'Common trap: sign slip',
      summary: 'First summary.',
      body_markdown: 'Initial explanation.',
    });

    const second = await repository.createArtifactContentVersion({
      artifact_id: 'artifact-1',
      title: 'Common trap: sign slip',
      summary: 'Updated summary.',
      body_markdown: 'Updated explanation with a corrected example.',
    });

    expect(second).toMatchObject({
      artifact_id: 'artifact-1',
      version_number: 2,
      is_current: true,
      lineage_parent_version_id: first.artifact_content_version_id,
      summary: 'Updated summary.',
    });

    await expect(repository.getCurrentArtifactContentByArtifactId('artifact-1')).resolves.toMatchObject({
      artifact_content_version_id: second.artifact_content_version_id,
      version_number: 2,
      is_current: true,
      lineage_parent_version_id: first.artifact_content_version_id,
    });

    await expect(repository.listArtifactContentVersionsByArtifactId('artifact-1')).resolves.toEqual([
      expect.objectContaining({
        artifact_content_version_id: second.artifact_content_version_id,
        version_number: 2,
        is_current: true,
      }),
      expect.objectContaining({
        artifact_content_version_id: first.artifact_content_version_id,
        version_number: 1,
        is_current: false,
      }),
    ]);

    expect(db.snapshot().get(first.artifact_content_version_id)).toMatchObject({
      is_current: false,
    });
  });

  test('failed replacement inserts do not clear the previous current version', async () => {
    const db = createArtifactContentDb();
    const repository = createArtifactContentRepository(db);

    const first = await repository.createArtifactContentVersion({
      artifact_id: 'artifact-1',
      title: 'Common trap: sign slip',
      summary: 'First summary.',
      body_markdown: 'Initial explanation.',
    });

    db.setNextInsertError({
      message: 'simulated insert failure',
    });

    await expect(repository.createArtifactContentVersion({
      artifact_id: 'artifact-1',
      title: 'Common trap: sign slip',
      summary: 'Replacement summary.',
      body_markdown: 'Replacement explanation.',
    })).rejects.toThrow('Failed to insert learning artifact content version');

    await expect(repository.getCurrentArtifactContentByArtifactId('artifact-1')).resolves.toMatchObject({
      artifact_content_version_id: first.artifact_content_version_id,
      version_number: 1,
      is_current: true,
      summary: 'First summary.',
    });

    expect(db.snapshot().get(first.artifact_content_version_id)).toMatchObject({
      is_current: true,
    });
  });
});
