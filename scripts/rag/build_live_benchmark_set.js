#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'data', 'eval', 'rag_live_set_v1.json');
const MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_live_set_v1_manifest.json');

function tokenizeTitle(title) {
  return String(title || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from('curriculum_nodes')
    .select('node_id, topic_path, title, description, syllabus_code')
    .not('node_id', 'is', null)
    .not('topic_path', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    throw new Error('curriculum_nodes has no rows for live benchmark');
  }

  const selected = rows.filter((x) => x.title).slice(0, 120);
  const cases = selected.map((row, idx) => {
    const title = String(row.title || '').trim();
    return {
      case_id: `live-${String(idx + 1).padStart(3, '0')}`,
      syllabus_node_id: row.node_id,
      current_topic_path: row.topic_path,
      subject_code: row.syllabus_code || String(row.topic_path || '').split('.')[0] || null,
      difficulty: idx % 3 === 0 ? 'easy' : idx % 3 === 1 ? 'medium' : 'hard',
      question_type: idx % 5 === 0 ? 'boundary' : 'concept',
      query: 'What is the title of this syllabus node?',
      reference_answer: title,
      expected_answer_keywords: tokenizeTitle(title),
      metadata: {
        description: row.description || '',
        gold_label_source: 'curriculum_nodes.title',
      },
    };
  });

  const stratify = (key) =>
    cases.reduce((acc, item) => {
      const bucket = String(item[key] || 'unknown');
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {});

  const manifest = {
    generated_at: new Date().toISOString(),
    dataset: path.relative(ROOT, OUT_FILE).replace(/\\/g, '/'),
    benchmark_profile: 'title_lookup_boundary_smoke_v1',
    gold_label_source: 'curriculum_nodes.title',
    total_cases: cases.length,
    strata: {
      difficulty: stratify('difficulty'),
      question_type: stratify('question_type'),
      subject_code: stratify('subject_code'),
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(cases, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n${MANIFEST_FILE}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
