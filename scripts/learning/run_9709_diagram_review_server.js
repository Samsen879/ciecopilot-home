#!/usr/bin/env node

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_9709_DIAGRAM_REVIEW_PATHS,
  buildHumanDiagramReviewState,
  defaultHumanDiagramReviewOut,
  recordHumanDiagramReviewDecision,
} from './lib/9709-diagram-human-review.js';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8799;

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function requiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    manifest: DEFAULT_9709_DIAGRAM_REVIEW_PATHS.manifest,
    evidenceBundles: DEFAULT_9709_DIAGRAM_REVIEW_PATHS.evidenceBundles,
    assetsRoot: DEFAULT_9709_DIAGRAM_REVIEW_PATHS.assetsRoot,
    reviewOut: defaultHumanDiagramReviewOut(),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--host') {
      options.host = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--port') {
      const port = Number(requiredValue(argv, index, token));
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new Error('--port must be an integer from 0 to 65535.');
      }
      options.port = port;
      index += 1;
      continue;
    }
    if (token === '--manifest') {
      options.manifest = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--evidence-bundles') {
      options.evidenceBundles = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--assets-root') {
      options.assetsRoot = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--review-out') {
      options.reviewOut = requiredValue(argv, index, token);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function printUsage() {
  writeStdoutLine(
    'Usage: node scripts/learning/run_9709_diagram_review_server.js [--host <host>] [--port <port>] [--manifest <path>] [--evidence-bundles <path>] [--assets-root <path>] [--review-out <path>]',
  );
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(response, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });
  response.end(text);
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function resolveAssetPath(assetsRoot, storageKey) {
  const normalizedStorageKey = typeof storageKey === 'string' ? storageKey.trim() : '';
  if (!normalizedStorageKey || normalizedStorageKey.includes('\0')) {
    throw new Error('storage_key is required.');
  }

  const root = path.resolve(assetsRoot);
  const candidate = path.resolve(root, normalizedStorageKey);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error('storage_key resolves outside the assets root.');
  }
  return candidate;
}

function sendImage(response, assetsRoot, storageKey) {
  let imagePath;
  try {
    imagePath = resolveAssetPath(assetsRoot, storageKey);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  if (!fs.existsSync(imagePath)) {
    sendJson(response, 404, { error: 'Image not found.', image_path: imagePath });
    return;
  }

  response.writeHead(200, {
    'content-type': 'image/png',
    'cache-control': 'no-store',
  });
  fs.createReadStream(imagePath).pipe(response);
}

function decisionToRecord(payload = {}) {
  const decision = typeof payload.decision === 'string' ? payload.decision.trim() : '';
  if (decision === 'present') {
    return { disposition: 'reviewed', diagramPresent: true };
  }
  if (decision === 'absent') {
    return { disposition: 'reviewed', diagramPresent: false };
  }
  if (decision === 'skip') {
    return { disposition: 'skipped', diagramPresent: null };
  }
  if (decision === 'pending') {
    return { disposition: 'pending', diagramPresent: null };
  }
  throw new Error('decision must be present, absent, skip, or pending.');
}

function renderReviewHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>9709 Diagram Review</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #1e293b;
      --muted: #64748b;
      --line: #cbd5e1;
      --paper: #f8fafc;
      --panel: #ffffff;
      --present: #047857;
      --absent: #b91c1c;
      --skip: #b45309;
      --focus: #2563eb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background: var(--paper);
      font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    button, input, textarea, select { font: inherit; }
    button {
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--ink);
      border-radius: 6px;
      min-height: 36px;
      padding: 0 12px;
      cursor: pointer;
    }
    button:hover { border-color: var(--focus); }
    button.primary { background: var(--present); border-color: var(--present); color: white; }
    button.danger { background: var(--absent); border-color: var(--absent); color: white; }
    button.warn { background: var(--skip); border-color: var(--skip); color: white; }
    button.active { outline: 2px solid var(--focus); outline-offset: 1px; }
    .app {
      display: grid;
      grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
      min-height: 100vh;
    }
    .sidebar {
      border-right: 1px solid var(--line);
      background: var(--panel);
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      min-height: 100vh;
    }
    .topbar, .filters, .workspace, .decisionbar {
      border-bottom: 1px solid var(--line);
      padding: 12px;
    }
    .title {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    h1 { font-size: 16px; margin: 0; letter-spacing: 0; }
    .muted { color: var(--muted); }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 10px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 6px 8px;
      background: #f8fafc;
    }
    .metric strong { display: block; font-size: 16px; }
    .filters {
      display: grid;
      gap: 8px;
    }
    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .search {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      min-height: 36px;
      padding: 0 10px;
    }
    .list {
      overflow: auto;
      padding: 8px;
    }
    .row {
      width: 100%;
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      min-height: 42px;
      padding: 6px 8px;
      text-align: left;
    }
    .row:hover, .row.selected { border-color: var(--focus); background: #eff6ff; }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #94a3b8;
      justify-self: center;
    }
    .dot.reviewed.present { background: var(--present); }
    .dot.reviewed.absent { background: var(--absent); }
    .dot.skipped { background: var(--skip); }
    .dot.conflict { box-shadow: 0 0 0 3px #fde68a; }
    .key { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta { color: var(--muted); font-size: 12px; }
    .main {
      min-width: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-height: 100vh;
    }
    .workspace {
      display: grid;
      gap: 8px;
      background: var(--panel);
    }
    .question-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .question-title {
      min-width: 0;
    }
    .storage-key {
      font-size: 18px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .chip {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px 8px;
      background: #f8fafc;
      color: var(--muted);
      font-size: 12px;
    }
    .values {
      display: grid;
      grid-template-columns: repeat(3, minmax(120px, 1fr));
      gap: 8px;
    }
    .value-box {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px;
      background: #f8fafc;
    }
    .value-box strong { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
    .image-wrap {
      min-height: 0;
      overflow: auto;
      padding: 8px 16px 16px;
      background: #e2e8f0;
    }
    .image-stage {
      width: 100%;
      min-height: 100%;
      display: grid;
      justify-items: center;
      align-items: start;
      align-content: start;
    }
    img.question {
      max-width: min(100%, 1180px);
      max-height: calc(100vh - 270px);
      background: white;
      border: 1px solid var(--line);
      border-radius: 4px;
    }
    .decisionbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      background: var(--panel);
      border-bottom: 0;
      padding: 0;
    }
    textarea {
      width: 100%;
      min-height: 42px;
      resize: vertical;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      align-content: start;
    }
    @media (max-width: 900px) {
      .app { grid-template-columns: 1fr; }
      .sidebar { min-height: 45vh; border-right: 0; border-bottom: 1px solid var(--line); }
      .main { min-height: 55vh; }
      .values, .decisionbar { grid-template-columns: 1fr; }
      img.question { max-height: 52vh; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <section class="topbar">
        <div class="title">
          <h1>9709 Diagram Review</h1>
          <span class="muted" id="saveState">loading</span>
        </div>
        <div class="summary">
          <div class="metric"><strong id="mReviewed">0</strong><span>reviewed</span></div>
          <div class="metric"><strong id="mPending">0</strong><span>pending</span></div>
          <div class="metric"><strong id="mConflict">0</strong><span>conflict</span></div>
        </div>
      </section>
      <section class="filters">
        <input class="search" id="search" placeholder="storage key, topic, q number">
        <div class="filter-row">
          <button id="filterAll" data-filter="all">All</button>
          <button id="filterPending" data-filter="pending">Pending</button>
          <button id="filterConflict" data-filter="conflict">Conflict</button>
          <button id="filterReviewed" data-filter="reviewed">Reviewed</button>
        </div>
      </section>
      <nav class="list" id="list"></nav>
    </aside>
    <main class="main">
      <section class="workspace">
        <div class="question-head">
          <div class="question-title">
            <div class="storage-key" id="storageKey"></div>
            <div class="chips" id="chips"></div>
          </div>
          <div class="actions">
            <button id="prev">Prev</button>
            <button id="next">Next</button>
            <button id="nextPending">Next pending</button>
          </div>
        </div>
        <div class="values">
          <div class="value-box"><strong>Manifest</strong><span id="vManifest"></span></div>
          <div class="value-box"><strong>Evidence</strong><span id="vEvidence"></span></div>
          <div class="value-box"><strong>Surface</strong><span id="vSurface"></span></div>
        </div>
        <div class="decisionbar">
          <textarea id="note" placeholder="note"></textarea>
          <div class="actions">
            <button class="primary" id="present" title="1">Present</button>
            <button class="danger" id="absent" title="0">Absent</button>
            <button class="warn" id="skip" title="S">Skip</button>
            <button id="clear">Clear</button>
          </div>
        </div>
      </section>
      <section class="image-wrap">
        <div class="image-stage">
          <img class="question" id="questionImage" alt="">
        </div>
      </section>
    </main>
  </div>
  <script>
    const el = (id) => document.getElementById(id);
    let artifact = null;
    let currentStorageKey = null;
    let filter = 'all';
    let query = '';

    function boolText(value) {
      if (value === true) return 'true';
      if (value === false) return 'false';
      return 'null';
    }

    function selectedItem() {
      return artifact?.items.find((item) => item.storage_key === currentStorageKey) ?? artifact?.items[0] ?? null;
    }

    function filteredItems() {
      if (!artifact) return [];
      const q = query.trim().toLowerCase();
      return artifact.items.filter((item) => {
        if (filter === 'pending' && item.disposition !== 'pending') return false;
        if (filter === 'reviewed' && item.disposition !== 'reviewed') return false;
        if (filter === 'conflict' && !item.original_has_conflict) return false;
        if (!q) return true;
        return [
          item.storage_key,
          item.primary_topic_path,
          String(item.paper ?? ''),
          String(item.q_number ?? ''),
        ].some((value) => String(value ?? '').toLowerCase().includes(q));
      });
    }

    function renderSummary() {
      const conflict = artifact.items.filter((item) => item.original_has_conflict).length;
      el('mReviewed').textContent = artifact.summary.reviewed;
      el('mPending').textContent = artifact.summary.pending;
      el('mConflict').textContent = conflict;
      el('saveState').textContent = artifact.updated_at ? 'saved' : 'loaded';
    }

    function renderList() {
      const list = el('list');
      list.innerHTML = '';
      for (const item of filteredItems()) {
        const button = document.createElement('button');
        button.className = 'row' + (item.storage_key === currentStorageKey ? ' selected' : '');
        button.type = 'button';
        button.addEventListener('click', () => {
          currentStorageKey = item.storage_key;
          render();
        });

        const dot = document.createElement('span');
        dot.className = 'dot';
        if (item.disposition === 'reviewed') dot.className += ' reviewed';
        if (item.reviewed_diagram_present === true) dot.className += ' present';
        if (item.reviewed_diagram_present === false) dot.className += ' absent';
        if (item.disposition === 'skipped') dot.className += ' skipped';
        if (item.original_has_conflict) dot.className += ' conflict';

        const text = document.createElement('span');
        text.innerHTML = '<span class="key"></span><span class="meta"></span>';
        text.querySelector('.key').textContent = item.storage_key;
        text.querySelector('.meta').textContent = 'P' + (item.paper ?? '?') + ' Q' + (item.q_number ?? '?') + ' ' + (item.primary_topic_path ?? '');

        const status = document.createElement('span');
        status.className = 'meta';
        status.textContent = item.disposition;

        button.append(dot, text, status);
        list.appendChild(button);
      }
    }

    function renderCurrent() {
      const item = selectedItem();
      if (!item) return;
      currentStorageKey = item.storage_key;
      el('storageKey').textContent = item.storage_key;
      el('chips').innerHTML = '';
      for (const chip of [
        'P' + (item.paper ?? '?'),
        'Q' + (item.q_number ?? '?'),
        item.primary_topic_path ?? 'topic:null',
        item.disposition,
      ]) {
        const span = document.createElement('span');
        span.className = 'chip';
        span.textContent = chip;
        el('chips').appendChild(span);
      }
      el('vManifest').textContent = boolText(item.original.manifest_diagram_present);
      el('vEvidence').textContent = boolText(item.original.evidence_diagram_present);
      el('vSurface').textContent = boolText(item.original.surface_posture_diagram_present);
      el('note').value = item.note ?? '';
      el('questionImage').src = '/image?storage_key=' + encodeURIComponent(item.storage_key) + '&v=' + encodeURIComponent(artifact.updated_at ?? '');
      el('questionImage').alt = item.storage_key;
      el('present').classList.toggle('active', item.reviewed_diagram_present === true);
      el('absent').classList.toggle('active', item.reviewed_diagram_present === false);
      el('skip').classList.toggle('active', item.disposition === 'skipped');
    }

    function renderFilters() {
      for (const button of document.querySelectorAll('[data-filter]')) {
        button.classList.toggle('active', button.dataset.filter === filter);
      }
    }

    function render() {
      renderSummary();
      renderFilters();
      renderCurrent();
      renderList();
    }

    async function loadState() {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error('Failed to load state');
      artifact = await response.json();
      currentStorageKey = currentStorageKey ?? artifact.items[0]?.storage_key ?? null;
      render();
    }

    async function sendDecision(decision) {
      const item = selectedItem();
      if (!item) return;
      el('saveState').textContent = 'saving';
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          storage_key: item.storage_key,
          decision,
          note: el('note').value,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Save failed' }));
        el('saveState').textContent = payload.error ?? 'save failed';
        return;
      }
      artifact = await response.json();
      currentStorageKey = item.storage_key;
      const next = artifact.items.find((candidate) => candidate.disposition === 'pending');
      if (decision !== 'pending' && next) currentStorageKey = next.storage_key;
      render();
    }

    function move(delta) {
      const items = filteredItems();
      const index = items.findIndex((item) => item.storage_key === currentStorageKey);
      if (index < 0) return;
      const next = items[Math.max(0, Math.min(items.length - 1, index + delta))];
      if (next) {
        currentStorageKey = next.storage_key;
        render();
      }
    }

    function moveNextPending() {
      const items = artifact.items;
      const currentIndex = items.findIndex((item) => item.storage_key === currentStorageKey);
      const ordered = [...items.slice(currentIndex + 1), ...items.slice(0, currentIndex + 1)];
      const next = ordered.find((item) => item.disposition === 'pending');
      if (next) {
        currentStorageKey = next.storage_key;
        render();
      }
    }

    el('present').addEventListener('click', () => sendDecision('present'));
    el('absent').addEventListener('click', () => sendDecision('absent'));
    el('skip').addEventListener('click', () => sendDecision('skip'));
    el('clear').addEventListener('click', () => sendDecision('pending'));
    el('prev').addEventListener('click', () => move(-1));
    el('next').addEventListener('click', () => move(1));
    el('nextPending').addEventListener('click', moveNextPending);
    el('search').addEventListener('input', (event) => {
      query = event.target.value;
      render();
    });
    for (const button of document.querySelectorAll('[data-filter]')) {
      button.addEventListener('click', () => {
        filter = button.dataset.filter;
        const items = filteredItems();
        currentStorageKey = items[0]?.storage_key ?? currentStorageKey;
        render();
      });
    }
    document.addEventListener('keydown', (event) => {
      if (['TEXTAREA', 'INPUT'].includes(event.target.tagName)) return;
      if (event.key === '1') sendDecision('present');
      if (event.key === '0') sendDecision('absent');
      if (event.key.toLowerCase() === 's') sendDecision('skip');
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    });

    loadState().catch((error) => {
      el('saveState').textContent = error.message;
    });
  </script>
</body>
</html>`;
}

export function create9709DiagramReviewServer({
  manifestPath,
  evidenceBundlesPath,
  assetsRoot,
  reviewOut,
} = {}) {
  let artifact = buildHumanDiagramReviewState({
    manifestPath,
    evidenceBundlesPath,
    assetsRoot,
    reviewOut,
  });

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');

      if (request.method === 'GET' && url.pathname === '/') {
        sendText(response, 200, renderReviewHtml(), 'text/html; charset=utf-8');
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/state') {
        sendJson(response, 200, artifact);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, { status: 'ok', summary: artifact.summary });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/image') {
        sendImage(response, assetsRoot, url.searchParams.get('storage_key'));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/review') {
        const payload = await readRequestJson(request);
        const { disposition, diagramPresent } = decisionToRecord(payload);
        artifact = recordHumanDiagramReviewDecision({
          artifact,
          reviewOut,
          storageKey: payload.storage_key,
          diagramPresent,
          disposition,
          note: payload.note,
          reviewedBy: 'human',
        });
        sendJson(response, 200, artifact);
        return;
      }

      sendJson(response, 404, { error: 'Not found.' });
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  });

  return {
    server,
    getArtifact: () => artifact,
  };
}

function listen(server, { host, port }) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve(server.address());
    });
  });
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const { server, getArtifact } = create9709DiagramReviewServer({
    manifestPath: options.manifest,
    evidenceBundlesPath: options.evidenceBundles,
    assetsRoot: options.assetsRoot,
    reviewOut: options.reviewOut,
  });
  const address = await listen(server, { host: options.host, port: options.port });
  const url = `http://${options.host}:${address.port}/`;
  writeStdoutLine(`9709_diagram_review_url=${url}`);
  writeStdoutLine(`9709_diagram_review_out=${path.resolve(options.reviewOut)}`);
  writeStdoutLine(`9709_diagram_review_total=${getArtifact().summary.total}`);
  return new Promise(() => {});
}

export function isEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }
  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isEntrypoint(process.argv[1], import.meta.url)) {
  try {
    await main();
  } catch (error) {
    writeStderrLine(error.message);
    process.exitCode = 1;
  }
}
