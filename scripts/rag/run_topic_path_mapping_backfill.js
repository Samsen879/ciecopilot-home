#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getServiceClient } from '../../api/lib/supabase/client.js';

dotenv.config();

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_topic_path_mapping_backfill_summary.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_topic_path_mapping_backfill.md');
const PAGE_SIZE = 500;
const RETRY_DELAYS_MS = [300, 800, 1500, 3000, 5000, 8000];
const SOURCE_TYPES_WITH_SUBJECT_FALLBACK = new Set(['note_md', 'past_paper_pdf', 'mark_scheme_pdf']);

const SYLLABUS_REFERENCE_PATH_MAP = Object.freeze({
  '9702.7': '9702.P2.Waves',
  '9702.10': '9702.P2.D_C_Circuits',
  '9702.21': '9702.P4.Alternating_Currents',
});

const NOTE_PATH_HINTS = Object.freeze({
  alternating_currents: '9702.P4.Alternating_Currents',
  waves: '9702.P2.Waves',
  battery_internal_resistance: '9702.P2.D_C_Circuits',
  circuit_analysis: '9702.P2.D_C_Circuits',
});

const PAPER_TRACK_MAP = Object.freeze({
  '9702:1': '9702.P1',
  '9702:2': '9702.P2',
  '9702:3': '9702.P3',
  '9702:4': '9702.P4',
  '9702:5': '9702.P5',
  '9231:1': '9231.FP1',
  '9231:2': '9231.FP2',
  '9231:3': '9231.FM',
  '9231:4': '9231.FS',
});

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTruthy(value) {
  if (typeof value === 'boolean') return value;
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
}

function toPositiveInt(value, fallback = null) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const text = normalizeText(value);
  if (!text) return [];
  return text.split(' ').filter(Boolean);
}

function tokenOverlapScore(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let matches = 0;
  for (const token of setA) {
    if (setB.has(token)) matches += 1;
  }
  const denom = Math.max(setA.size, setB.size);
  return denom > 0 ? matches / denom : 0;
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = String(keyFn(item) || 'unknown');
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function toConfidenceBucket(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'unknown';
  if (n >= 0.95) return '0.95-1.00';
  if (n >= 0.85) return '0.85-0.94';
  if (n >= 0.70) return '0.70-0.84';
  if (n >= 0.50) return '0.50-0.69';
  return '<0.50';
}

function isRetryableError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('unexpected eof') ||
    message.includes('socket')
  );
}

async function withRetry(fn) {
  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await fn(attempt + 1);
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt >= RETRY_DELAYS_MS.length) {
        throw error;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

function isMappedTopicPath(topicPath) {
  const value = String(topicPath || '').trim();
  return value.length > 0 && value.toLowerCase() !== 'unmapped';
}

function extractPaperNumberFromSourceRef(sourceRef = {}) {
  const paperId = String(sourceRef.paper_id || '').trim();
  if (paperId) {
    const match = paperId.match(/_(\d)(\d)$/);
    if (match) return Number.parseInt(match[1], 10);
  }

  const sourcePath = String(sourceRef.source_path || sourceRef.asset_id || '').toLowerCase();
  const pathMatch = sourcePath.match(/[\\/](?:paper|p)(\d)[\\/]/);
  if (pathMatch) return Number.parseInt(pathMatch[1], 10);
  const fileMatch = sourcePath.match(/_(\d)(\d)\.pdf$/);
  if (fileMatch) return Number.parseInt(fileMatch[1], 10);
  return null;
}

function extractSyllabusReference(content) {
  const text = String(content || '');
  const match = text.match(/syllabus\s*reference\**\s*:\s*([0-9]{4}\.[0-9]+)/i);
  return match ? match[1] : null;
}

function extractFirstHeading(content) {
  const lines = String(content || '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match) return match[1].trim();
    if (line.length >= 6) return line.slice(0, 120);
  }
  return '';
}

function buildNodeIndexes(nodes = []) {
  const byId = new Map();
  const byPath = new Map();
  const bySyllabus = new Map();
  const roots = new Map();

  for (const node of nodes) {
    const nodeId = String(node.node_id || '').trim();
    const topicPath = String(node.topic_path || '').trim();
    const syllabusCode = String(node.syllabus_code || node.subject_code || topicPath.split('.')[0] || '').trim();
    if (!nodeId || !topicPath || !syllabusCode) continue;

    byId.set(nodeId, node);
    byPath.set(topicPath, node);
    if (!bySyllabus.has(syllabusCode)) bySyllabus.set(syllabusCode, []);
    bySyllabus.get(syllabusCode).push(node);

    if (topicPath === syllabusCode) {
      roots.set(syllabusCode, node);
    }
  }

  for (const [syllabusCode, list] of bySyllabus.entries()) {
    list.sort((a, b) => String(a.topic_path).localeCompare(String(b.topic_path)));
    if (!roots.has(syllabusCode) && list.length > 0) {
      roots.set(syllabusCode, list[0]);
    }
  }

  return { byId, byPath, bySyllabus, roots };
}

function resolveNodeByPath(nodeIndexes, topicPath) {
  if (!topicPath) return null;
  return nodeIndexes.byPath.get(String(topicPath).trim()) || null;
}

function pickBestNodeByText(nodeIndexes, syllabusCode, text, { preferPaths = [] } = {}) {
  const candidates = nodeIndexes.bySyllabus.get(String(syllabusCode || '')) || [];
  if (candidates.length === 0 || !String(text || '').trim()) return null;

  let best = null;
  for (const node of candidates) {
    const title = String(node.title || '').trim();
    if (!title) continue;
    const score = tokenOverlapScore(text, title);
    if (!best || score > best.score) {
      best = { node, score };
    }
  }
  if (!best) return null;

  const tied = candidates
    .map((node) => ({ node, score: tokenOverlapScore(text, node.title || '') }))
    .filter((item) => item.score === best.score)
    .map((item) => item.node);

  if (tied.length > 1 && preferPaths.length > 0) {
    for (const preferred of preferPaths) {
      const hit = tied.find((node) => String(node.topic_path || '').startsWith(preferred));
      if (hit) {
        return { node: hit, score: best.score, tie_break: `prefer_path:${preferred}` };
      }
    }
  }

  return { node: best.node, score: best.score, tie_break: tied.length > 1 ? 'lexicographic' : 'none' };
}

function resolveNoteMapping(row, nodeIndexes) {
  const syllabusCode = String(row.syllabus_code || '').trim();
  const sourcePath = String(row.source_ref?.source_path || row.source_ref?.asset_id || '').trim();
  const fileName = sourcePath.split(/[\\/]/).pop() || '';
  const heading = extractFirstHeading(row.content);
  const syllabusReference = extractSyllabusReference(row.content);

  if (syllabusReference && SYLLABUS_REFERENCE_PATH_MAP[syllabusReference]) {
    const candidatePath = SYLLABUS_REFERENCE_PATH_MAP[syllabusReference];
    const node = resolveNodeByPath(nodeIndexes, candidatePath);
    if (node) {
      return {
        topic_path: node.topic_path,
        node_id: node.node_id,
        strategy: 'syllabus_reference_map',
        confidence: 0.99,
        detail: `syllabus_reference=${syllabusReference}`,
      };
    }
  }

  const normalizedFileName = normalizeText(fileName);
  for (const [hint, candidatePath] of Object.entries(NOTE_PATH_HINTS)) {
    if (normalizedFileName.includes(normalizeText(hint))) {
      const node = resolveNodeByPath(nodeIndexes, candidatePath);
      if (node) {
        return {
          topic_path: node.topic_path,
          node_id: node.node_id,
          strategy: 'note_path_hint_map',
          confidence: 0.95,
          detail: `file_hint=${hint}`,
        };
      }
    }
  }

  const textCandidate = heading || fileName;
  const fallback = pickBestNodeByText(nodeIndexes, syllabusCode, textCandidate, {
    preferPaths: ['9702.P2.', '9702.P4.', '9231.FP1.', '9231.FP2.'],
  });
  if (fallback && fallback.score >= 0.45) {
    return {
      topic_path: fallback.node.topic_path,
      node_id: fallback.node.node_id,
      strategy: 'title_similarity_map',
      confidence: Number(Math.min(0.9, 0.6 + fallback.score * 0.4).toFixed(4)),
      detail: `heading_match_score=${fallback.score.toFixed(4)}`,
    };
  }

  const root = nodeIndexes.roots.get(syllabusCode);
  if (root) {
    return {
      topic_path: root.topic_path,
      node_id: root.node_id,
      strategy: 'subject_root_fallback',
      confidence: 0.55,
      detail: `no_direct_note_match; syllabus_reference=${syllabusReference || 'none'}`,
    };
  }

  return null;
}

function resolvePdfMapping(row, nodeIndexes) {
  const syllabusCode = String(row.syllabus_code || '').trim();
  const paperNo = extractPaperNumberFromSourceRef(row.source_ref || {});
  if (paperNo != null) {
    const mapKey = `${syllabusCode}:${paperNo}`;
    const mappedPath = PAPER_TRACK_MAP[mapKey];
    if (mappedPath) {
      const node = resolveNodeByPath(nodeIndexes, mappedPath);
      if (node) {
        return {
          topic_path: node.topic_path,
          node_id: node.node_id,
          strategy: 'paper_track_map',
          confidence: 0.93,
          detail: `paper_no=${paperNo}`,
        };
      }
    }
  }

  const root = nodeIndexes.roots.get(syllabusCode);
  if (root) {
    return {
      topic_path: root.topic_path,
      node_id: root.node_id,
      strategy: 'subject_root_fallback',
      confidence: 0.58,
      detail: `paper_no=${paperNo == null ? 'unknown' : paperNo}`,
    };
  }

  return null;
}

function resolveRowMapping(row, nodeIndexes) {
  const existingNode = row.node_id ? nodeIndexes.byId.get(String(row.node_id)) : null;
  if (existingNode && isMappedTopicPath(existingNode.topic_path)) {
    return {
      topic_path: existingNode.topic_path,
      node_id: existingNode.node_id,
      strategy: 'existing_node_id',
      confidence: 1,
      detail: 'node_id already present',
    };
  }

  const existingPath = String(row.topic_path || '').trim();
  if (isMappedTopicPath(existingPath)) {
    const node = resolveNodeByPath(nodeIndexes, existingPath);
    if (node) {
      return {
        topic_path: node.topic_path,
        node_id: node.node_id,
        strategy: 'existing_topic_path',
        confidence: 1,
        detail: 'topic_path already mapped',
      };
    }
  }

  if (String(row.source_type || '') === 'note_md') {
    return resolveNoteMapping(row, nodeIndexes);
  }
  if (String(row.source_type || '') === 'past_paper_pdf' || String(row.source_type || '') === 'mark_scheme_pdf') {
    return resolvePdfMapping(row, nodeIndexes);
  }

  const syllabusCode = String(row.syllabus_code || '').trim();
  if (SOURCE_TYPES_WITH_SUBJECT_FALLBACK.has(String(row.source_type || '')) && syllabusCode) {
    const root = nodeIndexes.roots.get(syllabusCode);
    if (root) {
      return {
        topic_path: root.topic_path,
        node_id: root.node_id,
        strategy: 'subject_root_fallback',
        confidence: 0.5,
        detail: 'generic source_type fallback',
      };
    }
  }

  return null;
}

async function fetchCurriculumNodes(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const result = await withRetry(async () => (
      await supabase
        .from('curriculum_nodes')
        .select('node_id, topic_path, syllabus_code, subject_code, title, description')
        .order('node_id', { ascending: true })
        .range(from, to)
    ));

    if (result.error) {
      throw new Error(`Failed to fetch curriculum_nodes: ${result.error.message || result.error.code || result.error}`);
    }
    const batch = Array.isArray(result.data) ? result.data : [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchChunkRows(supabase, { onlyUnmapped = true, limit = null } = {}) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from('chunks')
      .select(
        [
          'id',
          'resource_id',
          'type',
          'page_no',
          'start_ptr',
          'end_ptr',
          'content',
          'embedding',
          'created_at',
          'metadata',
          'syllabus_code',
          'topic_path',
          'node_id',
          'source_type',
          'source_ref',
          'corpus_version',
          'content_hash',
        ].join(', '),
      )
      .order('id', { ascending: true })
      .range(from, to);

    if (onlyUnmapped) {
      query = query.eq('topic_path', 'unmapped');
    }

    const result = await withRetry(async () => await query);
    if (result.error) {
      throw new Error(`Failed to fetch chunks: ${result.error.message || result.error.code || result.error}`);
    }

    const batch = Array.isArray(result.data) ? result.data : [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    if (limit && rows.length >= limit) break;
  }

  if (limit && rows.length > limit) {
    return rows.slice(0, limit);
  }
  return rows;
}

function buildReplacementInsertPayload(row, mapping) {
  const payload = {
    ...row,
    topic_path: mapping.topic_path,
    node_id: mapping.node_id || null,
  };
  delete payload.id;
  delete payload.fts;
  return payload;
}

async function replaceByInsertDelete(supabase, row, mapping) {
  const payload = buildReplacementInsertPayload(row, mapping);
  const insertedResult = await withRetry(async () => (
    await supabase
      .from('chunks')
      .insert(payload)
      .select('id, topic_path, node_id')
      .single()
  ));

  if (insertedResult.error) {
    throw new Error(insertedResult.error.message || insertedResult.error.code || String(insertedResult.error));
  }

  const insertedRow = insertedResult.data;
  const deleteOldResult = await withRetry(async () => (
    await supabase
      .from('chunks')
      .delete()
      .eq('id', row.id)
  ));

  if (deleteOldResult.error) {
    const rollbackInserted = await withRetry(async () => (
      await supabase
        .from('chunks')
        .delete()
        .eq('id', insertedRow.id)
    ));
    if (rollbackInserted.error) {
      throw new Error(
        `replace fallback failed: delete_old=${deleteOldResult.error.message || deleteOldResult.error.code || deleteOldResult.error}; rollback_insert=${rollbackInserted.error.message || rollbackInserted.error.code || rollbackInserted.error}`,
      );
    }
    throw new Error(`replace fallback failed: ${deleteOldResult.error.message || deleteOldResult.error.code || deleteOldResult.error}`);
  }

  return {
    id: insertedRow.id,
    topic_path: insertedRow.topic_path,
    node_id: insertedRow.node_id,
    operation: 'replace_insert_delete',
    replaced_id: row.id,
  };
}

async function applyUpdate(supabase, row, mapping) {
  const payload = {
    topic_path: mapping.topic_path,
    node_id: mapping.node_id || null,
  };

  const result = await withRetry(async () => (
    await supabase
      .from('chunks')
      .update(payload)
      .eq('id', row.id)
      .select('id, topic_path, node_id')
      .single()
  ));

  if (result.error) {
    const message = String(result.error.message || result.error.code || result.error);
    if (message.toLowerCase().includes('updated_at')) {
      return replaceByInsertDelete(supabase, row, mapping);
    }
    throw new Error(message);
  }
  return {
    ...result.data,
    operation: 'update',
    replaced_id: row.id,
  };
}

function buildReport(summary) {
  const lines = [
    '# RAG Topic Path Mapping Backfill',
    '',
    `- Generated at: \`${summary.generated_at}\``,
    `- Mode: \`${summary.mode}\``,
    `- Status: \`${summary.status}\``,
    '',
    '## Totals',
    '',
    `- rows_scanned: \`${summary.totals.rows_scanned}\``,
    `- mapped_candidates: \`${summary.totals.mapped_candidates}\``,
    `- applied_updates: \`${summary.totals.applied_updates}\``,
    `- unchanged_rows: \`${summary.totals.unchanged_rows}\``,
    `- unresolved_rows: \`${summary.totals.unresolved_rows}\``,
    `- update_errors: \`${summary.totals.update_errors}\``,
    '',
    '## Strategy Counts',
    '',
  ];

  for (const [key, value] of Object.entries(summary.strategy_counts || {})) {
    lines.push(`- ${key}: \`${value}\``);
  }

  lines.push('', '## Confidence Buckets', '');
  for (const [key, value] of Object.entries(summary.confidence_buckets || {})) {
    lines.push(`- ${key}: \`${value}\``);
  }

  lines.push('', '## Apply Operations', '');
  for (const [key, value] of Object.entries(summary.apply_operation_counts || {})) {
    lines.push(`- ${key}: \`${value}\``);
  }

  lines.push('', '## Source Type Counts', '');
  for (const [key, value] of Object.entries(summary.source_type_counts || {})) {
    lines.push(`- ${key}: \`${value}\``);
  }

  lines.push('', '## Unresolved Examples (Top 20)', '');
  if (!Array.isArray(summary.unresolved_examples) || summary.unresolved_examples.length === 0) {
    lines.push('- none');
  } else {
    for (const item of summary.unresolved_examples.slice(0, 20)) {
      lines.push(
        `- id=\`${item.id}\` source_type=\`${item.source_type || 'null'}\` syllabus=\`${item.syllabus_code || 'null'}\` reason=\`${item.reason || 'n/a'}\``,
      );
    }
  }

  lines.push('', '## Applied Samples (Top 20)', '');
  if (!Array.isArray(summary.applied_samples) || summary.applied_samples.length === 0) {
    lines.push('- none');
  } else {
    for (const item of summary.applied_samples.slice(0, 20)) {
      lines.push(
        `- id=\`${item.id}\` \`${item.before_topic_path || 'null'}\` -> \`${item.after_topic_path || 'null'}\` strategy=\`${item.strategy}\` confidence=\`${item.confidence}\``,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

function summarizeStatus({
  unresolvedRows,
  updateErrors,
  appliedUpdates,
  rowsScanned,
  mappedCandidates,
  mode,
}) {
  if (updateErrors > 0) return 'fail';
  if (unresolvedRows > 0) return 'warn';
  if (rowsScanned === 0) return 'pass';
  if (mode === 'apply' && mappedCandidates > 0 && appliedUpdates === 0) return 'warn';
  return 'pass';
}

async function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const apply = isTruthy(argv.apply);
  const includeMapped = isTruthy(argv['include-mapped']);
  const limit = toPositiveInt(argv.limit, null);
  const onlyUnmapped = !includeMapped;

  const supabase = getServiceClient();
  const [nodes, chunkRows] = await Promise.all([
    fetchCurriculumNodes(supabase),
    fetchChunkRows(supabase, { onlyUnmapped, limit }),
  ]);
  const nodeIndexes = buildNodeIndexes(nodes);

  const appliedSamples = [];
  const unresolvedExamples = [];
  const updateErrors = [];
  const decisions = [];

  for (const row of chunkRows) {
    const mapping = resolveRowMapping(row, nodeIndexes);
    if (!mapping) {
      unresolvedExamples.push({
        id: row.id,
        source_type: row.source_type || null,
        syllabus_code: row.syllabus_code || null,
        topic_path: row.topic_path || null,
        node_id: row.node_id || null,
        reason: 'no_mapping_strategy',
      });
      continue;
    }

    const beforeTopicPath = String(row.topic_path || '').trim() || null;
    const beforeNodeId = row.node_id || null;
    const noChange = beforeTopicPath === mapping.topic_path && String(beforeNodeId || '') === String(mapping.node_id || '');

    const decision = {
      id: row.id,
      source_type: row.source_type || null,
      syllabus_code: row.syllabus_code || null,
      strategy: mapping.strategy,
      confidence: Number(mapping.confidence || 0),
      detail: mapping.detail || null,
      before_topic_path: beforeTopicPath,
      before_node_id: beforeNodeId,
      after_topic_path: mapping.topic_path,
      after_node_id: mapping.node_id || null,
      changed: !noChange,
      applied: false,
      apply_operation: null,
      replaced_id: null,
      apply_error: null,
    };

    if (apply && !noChange) {
      try {
        const updated = await applyUpdate(supabase, row, mapping);
        decision.applied = true;
        decision.apply_operation = updated?.operation || 'update';
        decision.replaced_id = updated?.replaced_id || row.id;
        decision.after_topic_path = updated?.topic_path || decision.after_topic_path;
        decision.after_node_id = updated?.node_id || decision.after_node_id;
      } catch (error) {
        decision.apply_error = error.message || String(error);
        updateErrors.push({
          id: row.id,
          strategy: mapping.strategy,
          message: decision.apply_error,
        });
      }
    }

    if ((decision.applied || (!apply && decision.changed)) && appliedSamples.length < 50) {
      appliedSamples.push(decision);
    }

    decisions.push(decision);
  }

  const mappedCandidates = decisions.length;
  const unchangedRows = decisions.filter((item) => !item.changed).length;
  const appliedUpdates = decisions.filter((item) => item.applied).length;
  const failedUpdates = updateErrors.length;
  const unresolvedRows = unresolvedExamples.length;
  const strategyCounts = countBy(decisions, (item) => item.strategy);
  const confidenceBuckets = countBy(decisions, (item) => toConfidenceBucket(item.confidence));
  const sourceTypeCounts = countBy(chunkRows, (row) => row.source_type || 'unknown');
  const applyOperationCounts = countBy(
    decisions.filter((item) => item.applied),
    (item) => item.apply_operation || 'unknown',
  );

  const summary = {
    generated_at: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry_run',
    status: summarizeStatus({
      unresolvedRows,
      updateErrors: failedUpdates,
      appliedUpdates: apply ? appliedUpdates : mappedCandidates - unchangedRows,
      rowsScanned: chunkRows.length,
      mappedCandidates,
      mode: apply ? 'apply' : 'dry_run',
    }),
    inputs: {
      only_unmapped: onlyUnmapped,
      include_mapped: includeMapped,
      limit,
    },
    totals: {
      rows_scanned: chunkRows.length,
      mapped_candidates: mappedCandidates,
      applied_updates: appliedUpdates,
      unchanged_rows: unchangedRows,
      unresolved_rows: unresolvedRows,
      update_errors: failedUpdates,
    },
    source_type_counts: sourceTypeCounts,
    strategy_counts: strategyCounts,
    confidence_buckets: confidenceBuckets,
    apply_operation_counts: applyOperationCounts,
    unresolved_examples: unresolvedExamples.slice(0, 50),
    applied_samples: appliedSamples.slice(0, 50),
    update_errors: updateErrors.slice(0, 50),
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, buildReport(summary), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
