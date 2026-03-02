#!/usr/bin/env node
// scripts/db/seed_question_bank.js
// Seed question_bank from asset_files — creates a stable question_id mapping
// for every (storage_key, q_number) pair found in asset_files.
//
// Usage:
//   node scripts/db/seed_question_bank.js              # dry-run (default)
//   node scripts/db/seed_question_bank.js --apply       # actually write
//
// Idempotent: uses ON CONFLICT (storage_key, q_number) DO NOTHING.

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchAssetFiles(supabase) {
  const allRows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('asset_files')
      .select('id, paper_id, storage_key, q_number')
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`asset_files query failed: ${error.message}`);
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

function deduplicateByStorageKeyQ(rows) {
  const seen = new Map();
  for (const row of rows) {
    const key = `${row.storage_key}::${row.q_number ?? 0}`;
    if (!seen.has(key)) {
      seen.set(key, row);
    }
  }
  return [...seen.values()];
}

async function seedQuestionBank(supabase, rows, dryRun) {
  const insertRows = rows.map((r) => ({
    paper_id: r.paper_id || null,
    storage_key: r.storage_key,
    q_number: r.q_number ?? 0,
  }));

  if (dryRun) {
    console.log(`[dry-run] Would insert ${insertRows.length} rows into question_bank`);
    if (insertRows.length > 0) {
      console.log('[dry-run] Sample:', JSON.stringify(insertRows.slice(0, 3), null, 2));
    }
    return { inserted: 0, skipped: insertRows.length };
  }

  // Batch insert in chunks of 500
  const chunkSize = 500;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < insertRows.length; i += chunkSize) {
    const chunk = insertRows.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('question_bank')
      .upsert(chunk, { onConflict: 'storage_key,q_number', ignoreDuplicates: true })
      .select('question_id');

    if (error) {
      console.error(`Chunk ${i}-${i + chunk.length} failed:`, error.message);
      skipped += chunk.length;
    } else {
      inserted += data?.length || 0;
      skipped += chunk.length - (data?.length || 0);
    }
  }

  return { inserted, skipped };
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  const supabase = getSupabase();

  console.log(`[seed_question_bank] mode=${dryRun ? 'dry-run' : 'APPLY'}`);

  // 1. Fetch all asset_files
  const assetFiles = await fetchAssetFiles(supabase);
  console.log(`[seed_question_bank] asset_files rows: ${assetFiles.length}`);

  if (assetFiles.length === 0) {
    console.log('[seed_question_bank] No asset_files found. Nothing to seed.');
    console.log('[seed_question_bank] The question_bank will be populated on-demand via asset_files fallback in attempt-repository.js.');
    return;
  }

  // 2. Deduplicate by (storage_key, q_number)
  const unique = deduplicateByStorageKeyQ(assetFiles);
  console.log(`[seed_question_bank] Unique (storage_key, q_number) pairs: ${unique.length}`);

  // 3. Seed
  const result = await seedQuestionBank(supabase, unique, dryRun);
  console.log(`[seed_question_bank] Done. inserted=${result.inserted}, skipped=${result.skipped}`);
}

main().catch((err) => {
  console.error('[seed_question_bank] Fatal:', err);
  process.exit(1);
});
