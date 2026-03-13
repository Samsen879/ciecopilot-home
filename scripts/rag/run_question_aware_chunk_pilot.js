/**
 * Question-Aware Chunk Pilot Runner
 *
 * Runs the question-aware parser on 2 QP + 2 matching MS files,
 * produces a chunk manifest JSON and summary MD.
 * NO database writes — output is local files only.
 *
 * Usage: node scripts/rag/run_question_aware_chunk_pilot.js
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { parseQuestionPaper, parseMarkScheme, buildPairingIndex } from './lib/question-aware-chunker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const require = createRequire(import.meta.url);

const PILOT_PAIRS = [
  {
    qp: 'data/past-papers/9709Mathematics/paper1/9709_w23_qp_13.pdf',
    ms: 'data/mark-schemes/9709Mathematics/9709_w23_ms_13.pdf',
    paper_id: '9709_w23_13',
    subject_code: '9709',
  },
  {
    qp: 'data/past-papers/9709Mathematics/paper1/9709_s23_qp_12.pdf',
    ms: 'data/mark-schemes/9709Mathematics/9709_s23_ms_12.pdf',
    paper_id: '9709_s23_12',
    subject_code: '9709',
  },
];

const MANIFEST_OUT = path.resolve(ROOT, 'runs/backend/rag_step3_question_aware_chunk_pilot_manifest.json');
const SUMMARY_OUT = path.resolve(ROOT, 'runs/backend/rag_step3_question_aware_chunk_pilot_summary.md');

async function extractPdfText(filePath) {
  const pdf = require('pdf-parse');
  const buf = fs.readFileSync(filePath);
  const data = await pdf(buf);
  return {
    text: data.text,
    numpages: data.numpages,
    textLength: data.text.length,
  };
}

function countBy(arr, key) {
  const counts = {};
  for (const item of arr) {
    const val = item[key] || 'unknown';
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

function avg(nums) {
  if (nums.length === 0) return 0;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));
}

function sum(nums) {
  return nums.reduce((a, b) => a + b, 0);
}

function annotateChunks(chunks, origin, paperId) {
  return chunks.map((chunk, index) => ({
    ...chunk,
    _origin: origin,
    _pair: paperId,
    _chunk_id: `${paperId}:${origin}:${chunk.question_id || chunk.source_type}:${chunk.subchunk_index ?? 0}:${index}`,
    _paired_chunk_ids: [],
  }));
}

function enrichPairing(annotatedQp, annotatedMs) {
  const pairingIndex = buildPairingIndex(annotatedQp, annotatedMs);
  const pairStats = {
    total_keys: pairingIndex.size,
    paired: 0,
    qp_only: 0,
    ms_only: 0,
    paired_chunk_links: 0,
  };

  for (const entry of pairingIndex.values()) {
    const hasQp = entry.qp.length > 0;
    const hasMs = entry.ms.length > 0;

    if (hasQp && hasMs) {
      pairStats.paired += 1;
      pairStats.paired_chunk_links += entry.qp.length * entry.ms.length;
      const qpIds = entry.qp.map((chunk) => chunk._chunk_id);
      const msIds = entry.ms.map((chunk) => chunk._chunk_id);
      for (const chunk of entry.qp) {
        chunk._paired_chunk_ids = msIds;
      }
      for (const chunk of entry.ms) {
        chunk._paired_chunk_ids = qpIds;
      }
    } else if (hasQp) {
      pairStats.qp_only += 1;
    } else if (hasMs) {
      pairStats.ms_only += 1;
    }
  }

  pairStats.pairing_rate = pairStats.total_keys > 0
    ? Number((pairStats.paired / pairStats.total_keys).toFixed(4))
    : 0;

  return { pairingIndex, pairStats };
}

async function main() {
  console.log('🔬 Question-Aware Chunk Pilot');
  console.log(`   Papers: ${PILOT_PAIRS.length} QP/MS pairs`);
  console.log(`   Output: ${path.relative(ROOT, MANIFEST_OUT)}\n`);

  const allChunks = [];
  const perPaperStats = [];

  for (const pair of PILOT_PAIRS) {
    const qpPath = path.resolve(ROOT, pair.qp);
    const msPath = path.resolve(ROOT, pair.ms);

    console.log(`\n📄 Processing: ${pair.paper_id}`);

    if (!fs.existsSync(qpPath)) {
      console.log(`   ⚠️  QP not found: ${pair.qp}`);
      perPaperStats.push({ paper_id: pair.paper_id, status: 'qp_not_found', qp_path: pair.qp });
      continue;
    }
    if (!fs.existsSync(msPath)) {
      console.log(`   ⚠️  MS not found: ${pair.ms}`);
      perPaperStats.push({ paper_id: pair.paper_id, status: 'ms_not_found', ms_path: pair.ms });
      continue;
    }

    console.log('   📖 Extracting QP text...');
    const qpData = await extractPdfText(qpPath);
    console.log(`      ${qpData.numpages} pages, ${qpData.textLength} chars`);

    console.log('   📖 Extracting MS text...');
    const msData = await extractPdfText(msPath);
    console.log(`      ${msData.numpages} pages, ${msData.textLength} chars`);

    console.log('   🔍 Parsing QP...');
    const qpChunks = parseQuestionPaper(qpData.text, {
      paper_id: pair.paper_id,
      subject_code: pair.subject_code,
    });
    console.log(`      → ${qpChunks.length} chunks`);

    const expectedQuestionIds = [...new Set(
      qpChunks
        .filter((chunk) => chunk.retrieval_eligible)
        .map((chunk) => chunk.question_id)
        .filter(Boolean),
    )];

    console.log('   🔍 Parsing MS...');
    const msChunks = parseMarkScheme(msData.text, {
      paper_id: pair.paper_id,
      subject_code: pair.subject_code,
      expected_question_ids: expectedQuestionIds,
    });
    console.log(`      → ${msChunks.length} chunks`);

    const annotatedQp = annotateChunks(qpChunks, 'qp', pair.paper_id);
    const annotatedMs = annotateChunks(msChunks, 'ms', pair.paper_id);
    const { pairStats } = enrichPairing(annotatedQp, annotatedMs);

    const stats = {
      paper_id: pair.paper_id,
      status: 'ok',
      qp_pages: qpData.numpages,
      qp_text_length: qpData.textLength,
      ms_pages: msData.numpages,
      ms_text_length: msData.textLength,
      qp_chunk_count: qpChunks.length,
      ms_chunk_count: msChunks.length,
      total_chunk_count: qpChunks.length + msChunks.length,
      qp_source_types: countBy(qpChunks, 'source_type'),
      ms_source_types: countBy(msChunks, 'source_type'),
      qp_retrieval_eligible: qpChunks.filter((chunk) => chunk.retrieval_eligible).length,
      ms_retrieval_eligible: msChunks.filter((chunk) => chunk.retrieval_eligible).length,
      pairing: pairStats,
      avg_qp_tokens: avg(qpChunks.map((chunk) => chunk.token_count)),
      avg_ms_tokens: avg(msChunks.map((chunk) => chunk.token_count)),
      qp_has_figure_count: qpChunks.filter((chunk) => chunk.has_figure).length,
      ms_has_figure_count: msChunks.filter((chunk) => chunk.has_figure).length,
      qp_latex_replacements: sum(qpChunks.map((chunk) => chunk.latex_replacements || 0)),
      ms_latex_replacements: sum(msChunks.map((chunk) => chunk.latex_replacements || 0)),
      expected_question_ids: expectedQuestionIds,
    };

    perPaperStats.push(stats);
    allChunks.push(...annotatedQp, ...annotatedMs);

    console.log(`   📊 Pairing: ${pairStats.paired} paired, ${pairStats.qp_only} QP-only, ${pairStats.ms_only} MS-only`);
    console.log(`   📊 QP source types: ${JSON.stringify(stats.qp_source_types)}`);
    console.log(`   📊 MS source types: ${JSON.stringify(stats.ms_source_types)}`);
  }

  const qualityChecks = {
    no_dots_in_content: allChunks.every((chunk) => !/\.{10,}/.test(chunk.content)),
    all_chunks_have_paper_id: allChunks.every((chunk) => chunk.paper_id && chunk.paper_id !== 'unknown'),
    all_retrieval_chunks_have_question_id: allChunks
      .filter((chunk) => chunk.retrieval_eligible)
      .every((chunk) => chunk.question_id),
    no_header_in_retrieval: allChunks
      .filter((chunk) => chunk.source_type === 'exam_header' || chunk.source_type === 'marking_principle')
      .every((chunk) => !chunk.retrieval_eligible),
    all_chunks_under_token_limit: allChunks.every((chunk) => chunk.token_count <= 800),
  };

  const manifest = {
    generated_at: new Date().toISOString(),
    pilot_version: 'question_aware_chunk_pilot_v2',
    pilot_pairs: PILOT_PAIRS.map((pair) => ({
      paper_id: pair.paper_id,
      qp: pair.qp,
      ms: pair.ms,
    })),
    total_chunks: allChunks.length,
    per_paper_stats: perPaperStats,
    quality_checks: qualityChecks,
    chunks: allChunks.map((chunk) => ({
      chunk_id: chunk._chunk_id,
      paper_id: chunk.paper_id,
      question_id: chunk.question_id,
      parent_question_id: chunk.parent_question_id,
      source_type: chunk.source_type,
      part_label: chunk.part_label,
      marks: chunk.marks,
      mark_labels: chunk.mark_labels,
      has_figure: chunk.has_figure,
      formula_density: chunk.formula_density,
      retrieval_eligible: chunk.retrieval_eligible,
      token_count: chunk.token_count,
      subchunk_index: chunk.subchunk_index,
      paired_chunk_ids: chunk._paired_chunk_ids,
      content_preview: chunk.content.slice(0, 200),
      origin: chunk._origin,
    })),
  };

  fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true });
  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Manifest written: ${path.relative(ROOT, MANIFEST_OUT)}`);

  const summaryLines = [
    '# Question-Aware Chunk Pilot Summary',
    '',
    `Generated: ${manifest.generated_at}`,
    `Total chunks: ${manifest.total_chunks}`,
    '',
    '## Quality Checks',
    '',
    ...Object.entries(qualityChecks).map(([key, value]) => `- **${key}**: ${value ? '✅ PASS' : '❌ FAIL'}`),
    '',
    '## Per-Paper Breakdown',
    '',
  ];

  for (const stats of perPaperStats) {
    if (stats.status !== 'ok') {
      summaryLines.push(`### ${stats.paper_id}: ${stats.status}`);
      continue;
    }

    summaryLines.push(`### ${stats.paper_id}`);
    summaryLines.push('');
    summaryLines.push('| Metric | QP | MS |');
    summaryLines.push('|--------|----|----|');
    summaryLines.push(`| Pages | ${stats.qp_pages} | ${stats.ms_pages} |`);
    summaryLines.push(`| Text length | ${stats.qp_text_length} | ${stats.ms_text_length} |`);
    summaryLines.push(`| Chunks | ${stats.qp_chunk_count} | ${stats.ms_chunk_count} |`);
    summaryLines.push(`| Retrieval-eligible | ${stats.qp_retrieval_eligible} | ${stats.ms_retrieval_eligible} |`);
    summaryLines.push(`| Avg tokens/chunk | ${stats.avg_qp_tokens} | ${stats.avg_ms_tokens} |`);
    summaryLines.push(`| Has figure | ${stats.qp_has_figure_count} | ${stats.ms_has_figure_count} |`);
    summaryLines.push(`| LaTeX replacements | ${stats.qp_latex_replacements} | ${stats.ms_latex_replacements} |`);
    summaryLines.push('');
    summaryLines.push(`**Pairing**: ${stats.pairing.paired} paired / ${stats.pairing.total_keys} total (${(stats.pairing.pairing_rate * 100).toFixed(1)}%)`);
    summaryLines.push(`QP-only: ${stats.pairing.qp_only}, MS-only: ${stats.pairing.ms_only}, paired chunk links: ${stats.pairing.paired_chunk_links}`);
    summaryLines.push(`Expected question ids: ${stats.expected_question_ids.join(', ')}`);
    summaryLines.push('');
  }

  summaryLines.push('## Chunk Listing');
  summaryLines.push('');
  summaryLines.push('| Paper | Origin | Type | question_id | subchunk | paired | Tokens | Figure? |');
  summaryLines.push('|-------|--------|------|-------------|----------|--------|--------|---------|');
  for (const chunk of allChunks) {
    summaryLines.push(
      `| ${chunk.paper_id} | ${chunk._origin} | ${chunk.source_type} | ${chunk.question_id || '—'} | ${chunk.subchunk_index ?? '—'} | ${chunk._paired_chunk_ids.length} | ${chunk.token_count} | ${chunk.has_figure ? '📊' : ''} |`,
    );
  }

  fs.writeFileSync(SUMMARY_OUT, summaryLines.join('\n'));
  console.log(`✅ Summary written: ${path.relative(ROOT, SUMMARY_OUT)}`);

  const allPass = Object.values(qualityChecks).every(Boolean);
  console.log(`\n${allPass ? '🟢' : '🔴'} Quality: ${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  for (const [key, value] of Object.entries(qualityChecks)) {
    console.log(`   ${value ? '✅' : '❌'} ${key}`);
  }
}

main().catch((err) => {
  console.error('❌ Pilot failed:', err);
  process.exit(1);
});
