import { listArtifactsByTopic } from '../lib/repositories/artifact-repository.js';

function createArtifactRepositoryDb() {
  const queries = [];
  const artifactRows = [
    {
      artifact_id: 'artifact-2',
      artifact_kind: 'misconception_card',
      canonical_home_topic_id: 'topic-1',
      slot_key: 'common_traps',
      placement_status: 'inbox',
      lifecycle_status: 'active',
      trust_status: 'grounded',
      artifact_state: 'verified',
      updated_at: '2026-04-17T12:01:00.000Z',
      created_at: '2026-04-17T12:01:00.000Z',
    },
    {
      artifact_id: 'artifact-1',
      artifact_kind: 'misconception_card',
      canonical_home_topic_id: 'topic-1',
      slot_key: 'common_traps',
      placement_status: 'pinned',
      lifecycle_status: 'active',
      trust_status: 'grounded',
      artifact_state: 'verified',
      updated_at: '2026-04-17T12:00:00.000Z',
      created_at: '2026-04-17T12:00:00.000Z',
    },
  ];
  const contentRows = [
    {
      artifact_content_version_id: 'content-1',
      artifact_id: 'artifact-1',
      version_number: 3,
      is_current: true,
      title: 'Resident content',
      summary: 'Pinned resident summary.',
      body_markdown: 'Resident content body.',
      content_format: 'markdown',
      render_payload: {},
      source_refs: [],
    },
    {
      artifact_content_version_id: 'content-2',
      artifact_id: 'artifact-2',
      version_number: 1,
      is_current: true,
      title: 'Inbox content',
      summary: 'Inbox summary.',
      body_markdown: 'Inbox body.',
      content_format: 'markdown',
      render_payload: {},
      source_refs: [],
    },
  ];

  function applyFilters(rows, filters = []) {
    let nextRows = [...rows];

    for (const filter of filters) {
      if (filter.type === 'eq') {
        nextRows = nextRows.filter((row) => row[filter.column] === filter.value);
      }

      if (filter.type === 'in') {
        nextRows = nextRows.filter((row) => filter.values.includes(row[filter.column]));
      }
    }

    return nextRows;
  }

  function applyOrders(rows, orders = []) {
    let nextRows = [...rows];

    for (const order of orders) {
      nextRows = nextRows.sort((left, right) => {
        const leftValue = left[order.column];
        const rightValue = right[order.column];
        const direction = order.options?.ascending === false ? -1 : 1;

        if (leftValue === rightValue) {
          return 0;
        }

        return leftValue > rightValue ? direction : -direction;
      });
    }

    return nextRows;
  }

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.orders = [];
      this.selection = null;
    }

    select(selection) {
      this.selection = selection;
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    in(column, values) {
      this.filters.push({ type: 'in', column, values });
      return this;
    }

    order(column, options = {}) {
      this.orders.push({ column, options });
      return this;
    }

    maybeSingle() {
      return this.#resolve({ maybeSingle: true });
    }

    then(resolve, reject) {
      return this.#resolve({}).then(resolve, reject);
    }

    #resolve(extra = {}) {
      queries.push({
        table: this.table,
        selection: this.selection,
        filters: [...this.filters],
        orders: [...this.orders],
        options: { ...extra },
      });

      if (this.table === 'learning_artifacts') {
        const rows = applyOrders(applyFilters(artifactRows, this.filters), this.orders);
        return Promise.resolve({ data: rows, error: null });
      }

      if (this.table === 'learning_artifact_content_versions') {
        const rows = applyOrders(applyFilters(contentRows, this.filters), this.orders);
        if (extra.maybeSingle) {
          return Promise.resolve({ data: rows[0] ?? null, error: null });
        }

        return Promise.resolve({ data: rows, error: null });
      }

      return Promise.reject(new Error(`Unexpected table: ${this.table}`));
    }
  }

  return {
    queries,
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

describe('artifact-repository', () => {
  test('listArtifactsByTopic batches current content loading into a single query', async () => {
    const db = createArtifactRepositoryDb();

    const rows = await listArtifactsByTopic(db, {
      topicId: 'topic-1',
    });

    expect(rows).toEqual([
      expect.objectContaining({
        artifact_id: 'artifact-2',
        title: 'Inbox content',
        summary: 'Inbox summary.',
        current_content_version_number: 1,
      }),
      expect.objectContaining({
        artifact_id: 'artifact-1',
        title: 'Resident content',
        summary: 'Pinned resident summary.',
        current_content_version_number: 3,
      }),
    ]);

    const contentQueries = db.queries.filter((query) => query.table === 'learning_artifact_content_versions');
    expect(contentQueries).toHaveLength(1);
    expect(contentQueries[0].filters).toEqual(expect.arrayContaining([
      { type: 'eq', column: 'is_current', value: true },
      { type: 'in', column: 'artifact_id', values: ['artifact-2', 'artifact-1'] },
    ]));
  });
});
