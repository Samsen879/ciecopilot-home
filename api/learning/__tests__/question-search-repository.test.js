import { searchQuestionProjection } from '../lib/repositories/question-search-repository.js';

class QueryBuilder {
  constructor(table, state) {
    this.table = table;
    this.state = state;
    this.operation = 'select';
    this.columns = '*';
    this.selectOptions = {};
    this.filters = [];
    this.orders = [];
    this.rangeArgs = null;
  }

  select(columns, options = {}) {
    this.columns = columns;
    this.selectOptions = options;
    return this;
  }

  eq(field, value) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  ilike(field, pattern) {
    this.filters.push({ type: 'ilike', field, pattern });
    return this;
  }

  order(field, options = {}) {
    this.orders.push({ field, options });
    return this;
  }

  range(from, to) {
    this.rangeArgs = { from, to };
    return this;
  }

  then(resolve, reject) {
    this.state.queries.push({
      table: this.table,
      operation: this.operation,
      columns: this.columns,
      selectOptions: this.selectOptions,
      filters: [...this.filters],
      orders: [...this.orders],
      range: this.rangeArgs,
    });

    return Promise.resolve(this.state.response()).then(resolve, reject);
  }
}

function createQuestionSearchDb(response = { data: [], count: 0, error: null }) {
  const state = {
    queries: [],
    response: typeof response === 'function' ? response : () => response,
  };

  return {
    state,
    from(table) {
      return new QueryBuilder(table, state);
    },
  };
}

describe('question-search-repository', () => {
  test('searchQuestionProjection applies structured filters and returns total with rows', async () => {
    const row = {
      question_id: 'question-1',
      source_kind: 'paper_question',
      subject_code: '9709',
      year: 2024,
      paper_number: 1,
      variant: 2,
      search_text: 'Prove the trigonometric identity.',
    };
    const db = createQuestionSearchDb({
      data: [row],
      count: 7,
      error: null,
    });

    const result = await searchQuestionProjection(db, {
      subject_code: '9709',
      year: 2024,
      paper_number: 1,
      variant: 2,
      page: 2,
      page_size: 3,
    });

    expect(db.state.queries).toEqual([
      {
        table: 'learning_question_search_projection',
        operation: 'select',
        columns: '*',
        selectOptions: { count: 'exact' },
        filters: [
          { type: 'eq', field: 'subject_code', value: '9709' },
          { type: 'eq', field: 'year', value: 2024 },
          { type: 'eq', field: 'paper_number', value: 1 },
          { type: 'eq', field: 'variant', value: 2 },
        ],
        orders: [{ field: 'question_id', options: { ascending: true } }],
        range: { from: 3, to: 5 },
      },
    ]);
    expect(result).toEqual({
      total: 7,
      rows: [row],
    });
  });

  test('searchQuestionProjection applies text search only to search_text with ilike', async () => {
    const db = createQuestionSearchDb({
      data: [],
      count: 0,
      error: null,
    });

    await searchQuestionProjection(db, {
      subject_code: '9709',
      query: 'identity',
      page: 1,
      page_size: 10,
    });

    expect(
      db.state.queries[0].filters.filter((filter) => filter.type === 'ilike'),
    ).toEqual([
      { type: 'ilike', field: 'search_text', pattern: '%identity%' },
    ]);
  });

  test('searchQuestionProjection translates page and page_size into a stable range window', async () => {
    const db = createQuestionSearchDb({
      data: [],
      count: 0,
      error: null,
    });

    await searchQuestionProjection(db, {
      subject_code: '9709',
      page: 3,
      page_size: 4,
    });

    expect(db.state.queries[0].range).toEqual({ from: 8, to: 11 });
  });

  test('searchQuestionProjection preserves imported-question fallback rows when descriptor fields are null', async () => {
    const importedRow = {
      question_id: 'question-imported-1',
      source_kind: 'imported_question',
      subject_code: '9709',
      summary: null,
      question_type: null,
      answer_form: null,
      year: null,
      session: null,
      paper_number: null,
      variant: null,
      search_text: 'Solve 2sin(x)=1 for 0<=x<=360.',
    };
    const db = createQuestionSearchDb({
      data: [importedRow],
      count: 1,
      error: null,
    });

    const result = await searchQuestionProjection(db, {
      subject_code: '9709',
      query: '2sin',
      page: 1,
      page_size: 10,
    });

    expect(db.state.queries[0].filters).toEqual([
      { type: 'eq', field: 'subject_code', value: '9709' },
      { type: 'ilike', field: 'search_text', pattern: '%2sin%' },
    ]);
    expect(result).toEqual({
      total: 1,
      rows: [importedRow],
    });
  });
});
