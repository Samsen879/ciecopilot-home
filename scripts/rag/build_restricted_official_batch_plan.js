#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);

function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[i + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeText(filePath, text) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, text, 'utf8');
}

function sessionSortValue(session) {
  return ({ w: 3, s: 2, m: 1 })[String(session || '').toLowerCase()] || 0;
}

function parsePaperIdentity(fileName) {
  const match = String(fileName || '').match(/^(\d{4})_([msw])(\d{2})_(qp|ms)_(\d{2})\.pdf$/i);
  if (!match) {
    return {
      paper_key: String(fileName || '').replace(/\.pdf$/i, ''),
      year: null,
      session: null,
      paper_number: null,
      source_kind: null,
    };
  }
  const [, subjectCode, session, shortYear, sourceKind, paperNumber] = match;
  const year = 2000 + Number.parseInt(shortYear, 10);
  return {
    paper_key: `${subjectCode}_${session.toLowerCase()}${shortYear}_${paperNumber}`,
    year,
    session: session.toLowerCase(),
    paper_number: Number.parseInt(paperNumber, 10),
    source_kind: sourceKind.toLowerCase(),
  };
}

function compareUnits(left, right) {
  if ((right.year || 0) !== (left.year || 0)) {
    return (right.year || 0) - (left.year || 0);
  }
  if (sessionSortValue(right.session) !== sessionSortValue(left.session)) {
    return sessionSortValue(right.session) - sessionSortValue(left.session);
  }
  if ((right.paper_number || 0) !== (left.paper_number || 0)) {
    return (right.paper_number || 0) - (left.paper_number || 0);
  }
  return String(right.paper_key || '').localeCompare(String(left.paper_key || ''));
}

function compareFiles(left, right) {
  const leftKind = left.source_type === 'past_paper_pdf' ? 0 : 1;
  const rightKind = right.source_type === 'past_paper_pdf' ? 0 : 1;
  if (leftKind !== rightKind) return leftKind - rightKind;
  return String(left.file_name || '').localeCompare(String(right.file_name || ''));
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = String(keyFn(item) || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildUnits(files) {
  const byKey = new Map();
  for (const file of Array.isArray(files) ? files : []) {
    const parsed = parsePaperIdentity(file.file_name);
    const key = parsed.paper_key;
    if (!byKey.has(key)) {
      byKey.set(key, {
        subject_code: file.subject_code,
        paper_track: file.paper_track,
        paper_key: key,
        year: parsed.year,
        session: parsed.session,
        paper_number: parsed.paper_number,
        files: [],
      });
    }
    byKey.get(key).files.push({
      ...file,
      source_kind: parsed.source_kind,
    });
  }

  return [...byKey.values()]
    .map((unit) => ({
      ...unit,
      files: [...unit.files].sort(compareFiles),
      file_count: unit.files.length,
      source_type_counts: countBy(unit.files, (item) => item.source_type),
      source_types: [...new Set(unit.files.map((item) => item.source_type))],
    }))
    .sort(compareUnits);
}

function partitionTrack(units, maxFilesPerBatch) {
  const batches = [];
  let current = [];
  let currentFileCount = 0;

  for (const unit of units) {
    const nextFileCount = currentFileCount + unit.file_count;
    if (current.length > 0 && nextFileCount > maxFilesPerBatch) {
      batches.push(current);
      current = [];
      currentFileCount = 0;
    }
    current.push(unit);
    currentFileCount += unit.file_count;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}

function renderReport(plan) {
  const lines = [
    '# RAG Step 3 Restricted-Official 9709 Batch Plan',
    '',
    `- generated_at: \`${plan.generated_at}\``,
    `- source_manifest: \`${plan.source_manifest}\``,
    `- subject_code: \`${plan.subject_code}\``,
    `- batch_size_limit_files: \`${plan.batch_size_limit_files}\``,
    `- total_files: \`${plan.totals.file_count}\``,
    `- total_units: \`${plan.totals.unit_count}\``,
    `- total_batches: \`${plan.totals.batch_count}\``,
    '',
    '## Strategy',
    '',
    '- Group by `paper_track`.',
    '- Keep `qp/ms` pairs from the same paper together in the same batch.',
    '- Order units by recency within each track (`latest_first`).',
    '- Use each batch manifest as the direct `--source-list-json` input to `scripts/rag_ingest.js`.',
    '',
    '## Batch Summary',
    '',
  ];

  for (const batch of plan.batches) {
    lines.push(`### ${batch.batch_id}`);
    lines.push('');
    lines.push(`- paper_track: \`${batch.paper_track}\``);
    lines.push(`- unit_count: \`${batch.unit_count}\``);
    lines.push(`- file_count: \`${batch.file_count}\``);
    lines.push(`- manifest: \`${batch.manifest_path}\``);
    lines.push(`- source_type_counts: \`${JSON.stringify(batch.source_type_counts)}\``);
    lines.push(`- paper_keys: \`${batch.first_paper_key}\` -> \`${batch.last_paper_key}\``);
    lines.push('');
  }

  lines.push('## Example Command');
  lines.push('');
  lines.push('```bash');
  lines.push(`node scripts/rag_ingest.js --subject ${plan.subject_code} --pdf --source-list-json ${plan.batches[0]?.manifest_path || '<batch-manifest.json>'} --write-mode canonical --corpus-version <corpus-version> --summary-out runs/backend/<batch-summary>.json --continue-on-error --skip-existing`);
  lines.push('```');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const subjectCode = String(argv.subject || '9709').trim();
  const manifestPath = path.join(
    ROOT,
    argv.manifest || `runs/backend/rag_step3_restricted_official_${subjectCode}_full_manifest.json`,
  );
  const outJson = path.join(
    ROOT,
    argv['out-json'] || `runs/backend/rag_step3_restricted_official_${subjectCode}_batch_plan.json`,
  );
  const outMd = path.join(
    ROOT,
    argv['out-md'] || `docs/reports/rag_step3_restricted_official_${subjectCode}_batch_plan.md`,
  );
  const outDir = path.join(
    ROOT,
    argv['out-dir'] || `runs/backend/rag_step3_restricted_official_${subjectCode}_batches`,
  );
  const maxFilesPerBatch = Number.isFinite(Number(argv['batch-size']))
    ? Math.max(2, Number(argv['batch-size']))
    : 24;

  const manifest = readJson(manifestPath);
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (files.length === 0) {
    throw new Error(`Manifest contains no files: ${manifestPath}`);
  }

  const units = buildUnits(files);
  const unitsByTrack = units.reduce((acc, unit) => {
    const key = String(unit.paper_track || 'unknown');
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(unit);
    return acc;
  }, new Map());

  const batches = [];
  const manifestSummaries = [];

  for (const paperTrack of [...unitsByTrack.keys()].sort((left, right) => Number(left) - Number(right))) {
    const trackUnits = unitsByTrack.get(paperTrack) || [];
    const trackBatches = partitionTrack(trackUnits, maxFilesPerBatch);
    trackBatches.forEach((unitBatch, index) => {
      const batchId = `${subjectCode}_t${paperTrack}_b${String(index + 1).padStart(2, '0')}`;
      const selected = unitBatch.flatMap((unit) => unit.files).map(({ source_kind, ...file }) => file);
      const manifestFile = path.join(outDir, `${batchId}.json`);
      const sourceTypeCounts = countBy(selected, (item) => item.source_type);
      const batchPayload = {
        generated_at: new Date().toISOString(),
        manifest_role: 'restricted_official_ingest_batch',
        policy_mode: 'restricted_official',
        derived_from: toRel(manifestPath),
        subject_code: subjectCode,
        batch_id: batchId,
        batch_index: index + 1,
        paper_track: Number(paperTrack),
        batch_size_limit_files: maxFilesPerBatch,
        unit_count: unitBatch.length,
        file_count: selected.length,
        source_type_counts: sourceTypeCounts,
        units: unitBatch.map((unit) => ({
          paper_key: unit.paper_key,
          year: unit.year,
          session: unit.session,
          paper_number: unit.paper_number,
          file_count: unit.file_count,
          source_types: unit.source_types,
        })),
        selected,
      };
      writeJson(manifestFile, batchPayload);

      const summary = {
        batch_id: batchId,
        batch_index: index + 1,
        paper_track: Number(paperTrack),
        manifest_path: toRel(manifestFile),
        unit_count: unitBatch.length,
        file_count: selected.length,
        source_type_counts: sourceTypeCounts,
        first_paper_key: unitBatch[0]?.paper_key || null,
        last_paper_key: unitBatch[unitBatch.length - 1]?.paper_key || null,
      };
      batches.push(summary);
      manifestSummaries.push(summary.manifest_path);
    });
  }

  const plan = {
    generated_at: new Date().toISOString(),
    policy_mode: 'restricted_official',
    subject_code: subjectCode,
    source_manifest: toRel(manifestPath),
    selection_rule: manifest.selection_rule || null,
    manifest_role: manifest.manifest_role || null,
    batch_size_limit_files: maxFilesPerBatch,
    batch_strategy: {
      group_by: 'paper_track',
      keep_paper_pairs_together: true,
      ordering: 'latest_first_within_track',
    },
    totals: {
      file_count: files.length,
      unit_count: units.length,
      batch_count: batches.length,
      by_source_type: countBy(files, (item) => item.source_type),
      by_paper_track: countBy(files, (item) => item.paper_track),
    },
    batches,
    batch_manifest_paths: manifestSummaries,
  };

  writeJson(outJson, plan);
  writeText(outMd, renderReport(plan));
  process.stdout.write(`${toRel(outJson)}\n${toRel(outMd)}\n${toRel(outDir)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
