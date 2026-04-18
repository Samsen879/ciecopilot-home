import { Pool } from 'pg';

const JSONB_COLUMNS = new Map([
  ['attempts', new Set(['submitted_steps'])],
  ['mark_runs', new Set(['request_summary', 'response_summary'])],
  ['error_events', new Set(['metadata'])],
  ['learning_question_analysis_snapshots', new Set([
    'secondary_topic_ids',
    'secondary_question_type_ids',
    'variant_tags',
    'candidate_rubric_refs',
    'prerequisite_topic_ids',
    'canonical_step_skeleton_summary',
    'difficulty_signal',
    'analysis_audit_metadata',
    'evidence_source_event_ref',
    'low_confidence_posture',
  ])],
  ['learning_question_events', new Set([
    'event_payload',
    'provenance',
  ])],
  ['question_bank', new Set([
    'paper_scope',
    'secondary_topic_ids',
    'secondary_question_type_ids',
    'variant_tags',
    'classification_snapshot_ref',
    'prompt_representation',
    'provenance_summary',
  ])],
]);

const LTREE_COLUMNS = new Map([
  ['attempts', new Set(['topic_path'])],
  ['error_events', new Set(['topic_path'])],
  ['curriculum_nodes', new Set(['topic_path'])],
  ['question_concept_links', new Set(['topic_path'])],
]);

let pool = null;
let compatClient = null;

export function isPgCompatEnabled() {
  return process.env.SUPABASE_PG_COMPAT === 'true';
}

function requireDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_DATABASE_URL;

  if (!url) {
    throw new Error('Missing DATABASE_URL for SUPABASE_PG_COMPAT mode');
  }
  return url;
}

function getPool() {
  if (pool) return pool;
  pool = new Pool({
    connectionString: requireDatabaseUrl(),
  });
  return pool;
}

function quoteIdent(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsupported SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function splitSelect(selectClause) {
  const tokens = [];
  let depth = 0;
  let current = '';

  for (const char of String(selectClause || '*')) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) tokens.push(current.trim());
  return tokens.length > 0 ? tokens : ['*'];
}

function usesJsonb(table, column) {
  return JSONB_COLUMNS.get(table)?.has(column) === true;
}

function usesLtree(table, column) {
  return LTREE_COLUMNS.get(table)?.has(column) === true;
}

function normalizeParameterValue(table, column, value) {
  if (value === undefined || value === null) return null;
  if (usesJsonb(table, column)) {
    return JSON.stringify(value);
  }
  return value;
}

function buildPlaceholder(table, column, index) {
  if (usesJsonb(table, column)) return `$${index}::jsonb`;
  if (usesLtree(table, column)) return `$${index}::ltree`;
  return `$${index}`;
}

function shapeRow(row) {
  const out = { ...row };

  for (const key of Object.keys(row)) {
    if (!key.startsWith('__rel_')) continue;
    const relKey = key.slice('__rel_'.length);
    const [relation, field] = relKey.split('.');
    if (!out[relation]) out[relation] = {};
    out[relation][field] = row[key];
    delete out[key];
  }

  return out;
}

function buildWhereClause(tableAlias, filters, table, startingIndex = 1) {
  const values = [];
  const clauses = [];

  for (const filter of filters) {
    const columnSql = `${tableAlias}.${quoteIdent(filter.column)}`;
    if (filter.value === null) {
      clauses.push(`${columnSql} IS NULL`);
      continue;
    }

    values.push(normalizeParameterValue(table, filter.column, filter.value));
    clauses.push(`${columnSql} = $${startingIndex + values.length - 1}`);
  }

  return {
    sql: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

function buildProjection(table, selection, { alias = 't', returning = false } = {}) {
  const joins = [];
  const columns = [];

  for (const token of splitSelect(selection)) {
    if (token === '*') {
      columns.push(returning ? '*' : `${alias}.*`);
      continue;
    }

    if (token === 'curriculum_nodes(topic_path)') {
      if (table !== 'question_concept_links' || returning) {
        throw new Error(`Unsupported relation projection for table=${table}: ${token}`);
      }
      joins.push(
        ` LEFT JOIN public.curriculum_nodes curriculum_nodes ON curriculum_nodes.node_id = ${alias}.node_id`,
      );
      columns.push(
        `curriculum_nodes.topic_path::text AS "__rel_curriculum_nodes.topic_path"`,
      );
      continue;
    }

    const ident = quoteIdent(token);
    const source = returning ? ident : `${alias}.${ident}`;
    if (usesLtree(table, token)) {
      columns.push(`${source}::text AS ${ident}`);
    } else {
      columns.push(source);
    }
  }

  return {
    joins,
    sql: columns.join(', '),
  };
}

function singleResult(rows, mode) {
  if (!mode) {
    return { data: rows, error: null };
  }

  if (rows.length === 1) {
    return { data: rows[0], error: null };
  }

  if (mode === 'maybeSingle' && rows.length === 0) {
    return { data: null, error: null };
  }

  return {
    data: null,
    error: {
      code: 'PGRST116',
      message:
        rows.length === 0
          ? 'JSON object requested, no rows returned'
          : 'JSON object requested, multiple rows returned',
    },
  };
}

class PgCompatQueryBuilder {
  constructor(poolInstance, table) {
    this.pool = poolInstance;
    this.table = table;
    this.mode = 'select';
    this.selection = '*';
    this.returning = null;
    this.filters = [];
    this.orders = [];
    this.limitValue = null;
    this.insertRows = null;
    this.updateValues = null;
    this.singleMode = null;
    this.promise = null;
  }

  select(selection) {
    if (this.mode === 'insert' || this.mode === 'update') {
      this.returning = selection;
      return this;
    }
    this.mode = 'select';
    this.selection = selection;
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, value });
    return this;
  }

  is(column, value) {
    this.filters.push({ column, value });
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orders.push({ column, ascending });
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  insert(rows) {
    this.mode = 'insert';
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(values) {
    this.mode = 'update';
    this.updateValues = values || {};
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this.execute();
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this.execute();
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }

  finally(handler) {
    return this.execute().finally(handler);
  }

  execute() {
    if (!this.promise) {
      this.promise = this.run();
    }
    return this.promise;
  }

  async run() {
    try {
      if (this.mode === 'insert') return await this.runInsert();
      if (this.mode === 'update') return await this.runUpdate();
      return await this.runSelect();
    } catch (error) {
      return {
        data: null,
        error: {
          code: error?.code || 'PG_COMPAT_ERROR',
          message: error?.message || String(error),
        },
      };
    }
  }

  async runSelect() {
    const projection = buildProjection(this.table, this.selection, { alias: 't' });
    const where = buildWhereClause('t', this.filters, this.table);
    const params = [...where.values];
    let sql = `SELECT ${projection.sql} FROM public.${quoteIdent(this.table)} t${projection.joins.join('')}${where.sql}`;

    if (this.orders.length > 0) {
      sql += ` ORDER BY ${this.orders
        .map(({ column, ascending }) => `t.${quoteIdent(column)} ${ascending ? 'ASC' : 'DESC'}`)
        .join(', ')}`;
    }

    if (this.limitValue != null) {
      params.push(this.limitValue);
      sql += ` LIMIT $${params.length}`;
    }

    const result = await this.pool.query(sql, params);
    const rows = result.rows.map(shapeRow);
    return singleResult(rows, this.singleMode);
  }

  async runInsert() {
    const rows = this.insertRows || [];
    if (rows.length === 0) {
      return singleResult([], this.singleMode);
    }

    const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
    if (columns.length === 0) {
      throw new Error(`Cannot insert empty row into ${this.table}`);
    }

    const params = [];
    const valuesSql = rows
      .map((row) => {
        const tuple = columns.map((column) => {
          params.push(normalizeParameterValue(this.table, column, row?.[column]));
          return buildPlaceholder(this.table, column, params.length);
        });
        return `(${tuple.join(', ')})`;
      })
      .join(', ');

    let sql = `INSERT INTO public.${quoteIdent(this.table)} (${columns.map(quoteIdent).join(', ')}) VALUES ${valuesSql}`;
    if (this.returning) {
      const projection = buildProjection(this.table, this.returning, { returning: true });
      sql += ` RETURNING ${projection.sql}`;
    }

    const result = await this.pool.query(sql, params);
    const rowsOut = this.returning ? result.rows.map(shapeRow) : [];
    return singleResult(rowsOut, this.singleMode);
  }

  async runUpdate() {
    const assignments = Object.keys(this.updateValues || {});
    if (assignments.length === 0) {
      throw new Error(`Cannot update ${this.table} without values`);
    }

    const params = [];
    const setSql = assignments
      .map((column) => {
        params.push(normalizeParameterValue(this.table, column, this.updateValues[column]));
        return `${quoteIdent(column)} = ${buildPlaceholder(this.table, column, params.length)}`;
      })
      .join(', ');

    const where = buildWhereClause('t', this.filters, this.table, params.length + 1);
    params.push(...where.values);
    const whereSql = where.sql.replaceAll('t.', '');

    let sql = `UPDATE public.${quoteIdent(this.table)} SET ${setSql}${whereSql}`;
    if (this.returning) {
      const projection = buildProjection(this.table, this.returning, { returning: true });
      sql += ` RETURNING ${projection.sql}`;
    }

    const result = await this.pool.query(sql, params);
    const rows = this.returning ? result.rows.map(shapeRow) : [];
    return singleResult(rows, this.singleMode);
  }
}

async function callRpc(poolInstance, functionName, args) {
  if (functionName !== 'insert_mark_decisions') {
    return {
      data: null,
      error: {
        code: 'PG_COMPAT_RPC_UNSUPPORTED',
        message: `Unsupported RPC in SUPABASE_PG_COMPAT mode: ${functionName}`,
      },
    };
  }

  const result = await poolInstance.query(
    'SELECT * FROM public.insert_mark_decisions($1::uuid, $2::jsonb)',
    [args?.p_mark_run_id || null, JSON.stringify(args?.p_decisions || [])],
  );

  return {
    data: result.rows.map(shapeRow),
    error: null,
  };
}

export function getPgCompatClient() {
  if (compatClient) return compatClient;

  const poolInstance = getPool();
  compatClient = {
    __pgCompat: true,
    from(table) {
      return new PgCompatQueryBuilder(poolInstance, table);
    },
    rpc(functionName, args) {
      return callRpc(poolInstance, functionName, args).catch((error) => ({
        data: null,
        error: {
          code: error?.code || 'PG_COMPAT_RPC_ERROR',
          message: error?.message || String(error),
        },
      }));
    },
    auth: {
      async getUser() {
        return {
          data: { user: null },
          error: {
            code: 'PG_COMPAT_AUTH_UNSUPPORTED',
            message: 'auth.getUser is unavailable in SUPABASE_PG_COMPAT mode',
          },
        };
      },
    },
  };

  return compatClient;
}

export async function resetPgCompatClient() {
  compatClient = null;
  if (pool) {
    const current = pool;
    pool = null;
    await current.end();
  }
}
