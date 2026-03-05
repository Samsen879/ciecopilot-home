#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import {
  CANONICAL_CHUNK_COLUMNS,
  renderCanonicalChunkContractReport,
  summarizeCanonicalChunkContract,
} from './lib/canonical-chunk-contract.js';

dotenv.config();

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_canonical_chunk_contract_summary.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_canonical_chunk_contract.md');

async function loadColumnMetadata(supabase) {
  try {
    const { data, error } = await supabase
      .schema('information_schema')
      .from('columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'chunks');

    if (error) {
      return { availableColumns: null, error: error.message || error.code || String(error) };
    }

    return {
      availableColumns: new Set((Array.isArray(data) ? data : []).map((row) => row.column_name)),
      error: null,
    };
  } catch (error) {
    return {
      availableColumns: null,
      error: error.message || String(error),
    };
  }
}

async function probeColumn(supabase, column) {
  try {
    const { error } = await supabase.from('chunks').select(column).limit(1);
    if (error) {
      if ((error.message || '').includes(`column chunks.${column} does not exist`)) {
        return { exists: false, error: error.message };
      }
      return { exists: false, error: error.message || error.code || String(error) };
    }
    return { exists: true, error: null };
  } catch (error) {
    return {
      exists: false,
      error: error.message || String(error),
    };
  }
}

async function fetchContractRows(supabase, availableColumns) {
  const requiredForCoverage = ['source_ref', 'corpus_version', 'content_hash'];
  const selected = Array.from(new Set(['id', ...availableColumns.filter(Boolean)]));
  if (selected.length === 1 && selected[0] === 'id') {
    return [];
  }
  const { data, error } = await supabase.from('chunks').select(selected.join(',')).limit(500);
  if (error) {
    throw new Error(`Failed to fetch canonical chunk rows: ${error.message || error.code || error}`);
  }
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => {
    for (const field of requiredForCoverage) {
      if (!Object.hasOwn(row, field)) row[field] = null;
    }
    return row;
  });
}

async function main() {
  const supabase = getServiceClient();
  const columnPresence = {};
  const probeErrors = {};
  const metadata = await loadColumnMetadata(supabase);

  if (metadata.availableColumns) {
    for (const column of CANONICAL_CHUNK_COLUMNS) {
      columnPresence[column] = metadata.availableColumns.has(column);
      if (!columnPresence[column]) {
        probeErrors[column] = 'missing from information_schema.columns';
      }
    }
  } else {
    probeErrors.__metadata__ = metadata.error || 'failed to load information_schema.columns';
    const baselineColumns = ['id', 'content', 'embedding', 'syllabus_code', 'topic_path', 'node_id'];
    for (const column of baselineColumns) {
      const result = await probeColumn(supabase, column);
      columnPresence[column] = result.exists;
      if (result.error) probeErrors[column] = result.error;
    }
    for (const column of CANONICAL_CHUNK_COLUMNS.filter((item) => !baselineColumns.includes(item))) {
      const result = await probeColumn(supabase, column);
      columnPresence[column] = result.exists;
      if (result.error) probeErrors[column] = result.error;
    }
  }

  const availableColumns = CANONICAL_CHUNK_COLUMNS.filter((column) => columnPresence[column] === true);
  const rows = await fetchContractRows(supabase, availableColumns);
  const summary = summarizeCanonicalChunkContract({ columnPresence, rows, probeErrors });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderCanonicalChunkContractReport(summary), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
