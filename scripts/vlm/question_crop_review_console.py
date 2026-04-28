#!/usr/bin/env python3
"""Serve a local browser console for reviewing question crop screenshots."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
from typing import Any
from urllib.parse import unquote, urlparse


VALID_STATUSES = {"pass", "fail", "review", "skip"}
REVIEW_SCHEMA_VERSION = "question_crop_review_decisions_v1"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json_atomic(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
        tmp_path = Path(handle.name)
    tmp_path.replace(path)


def _as_int(value: Any) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _as_zero_based_index(value: Any) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed >= 0 else None


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def _tail_after_review_root_name(path: Path, review_root_name: str) -> Path | None:
    parts = path.parts
    for index, part in enumerate(parts):
        if part == review_root_name and index + 1 < len(parts):
            return Path(*parts[index + 1 :])
    return None


def _record_media_relpath(record: dict[str, Any], *, review_root: Path, workspace_root: Path) -> tuple[str, bool]:
    raw_output = str(record.get("output_path") or "")
    if not raw_output:
        return "", False

    output_path = Path(raw_output)
    candidates: list[Path] = []
    if output_path.is_absolute():
        candidates.append(output_path)
    else:
        tail = _tail_after_review_root_name(output_path, review_root.name)
        if tail is not None:
            candidates.append(review_root / tail)
        candidates.append(review_root / output_path)
        candidates.append(workspace_root / output_path)

    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved.exists() and _is_relative_to(resolved, review_root):
            return resolved.relative_to(review_root).as_posix(), True

    for candidate in candidates:
        resolved = candidate.resolve()
        if _is_relative_to(resolved, review_root):
            return resolved.relative_to(review_root).as_posix(), False

    tail = _tail_after_review_root_name(output_path, review_root.name)
    if tail is not None:
        return tail.as_posix(), False
    return output_path.name, False


def _record_warnings(records: list[dict[str, Any]], image_missing: bool) -> list[str]:
    warnings: list[str] = []
    for record in records:
        crop_box = _as_list(record.get("crop_box"))
        if len(crop_box) != 4:
            continue
        try:
            x1, y1, x2, y2 = [int(value) for value in crop_box]
        except (TypeError, ValueError):
            continue
        if x2 - x1 < 160 and "narrow_crop" not in warnings:
            warnings.append("narrow_crop")
        if y2 - y1 < 300 and "short_crop" not in warnings:
            warnings.append("short_crop")
    if image_missing:
        warnings.append("missing_file")
    return warnings


def load_review_store(reviews_path: Path) -> dict[str, Any]:
    if not reviews_path.exists():
        return {
            "schema_version": REVIEW_SCHEMA_VERSION,
            "source_root": "",
            "updated_at": "",
            "decisions": {},
        }
    data = _read_json(reviews_path)
    decisions = data.get("decisions")
    if not isinstance(decisions, dict):
        decisions = {}
    return {
        "schema_version": data.get("schema_version") or REVIEW_SCHEMA_VERSION,
        "source_root": data.get("source_root") or "",
        "updated_at": data.get("updated_at") or "",
        "decisions": decisions,
    }


def save_decision(reviews_path: Path, decision: dict[str, Any], *, source_root: Path) -> dict[str, Any]:
    item_id = str(decision.get("item_id") or "").strip()
    status = str(decision.get("status") or "").strip()
    if not item_id:
        raise ValueError("item_id is required")
    if status not in VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    store = load_review_store(reviews_path)
    flags = [str(flag).strip() for flag in _as_list(decision.get("flags")) if str(flag).strip()]
    saved_decision = {
        "item_id": item_id,
        "pdf_stem": str(decision.get("pdf_stem") or ""),
        "q_number": _as_int(decision.get("q_number")),
        "status": status,
        "flags": flags,
        "note": str(decision.get("note") or ""),
        "updated_at": _utc_now(),
    }
    store["schema_version"] = REVIEW_SCHEMA_VERSION
    store["source_root"] = str(source_root)
    store["updated_at"] = saved_decision["updated_at"]
    store.setdefault("decisions", {})[item_id] = saved_decision
    _write_json_atomic(reviews_path, store)
    return store


def _iter_payload_summaries(batch: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(batch.get("items"), list):
        return [item for item in batch["items"] if isinstance(item, dict)]
    if isinstance(batch.get("records"), list):
        return [batch]
    return []


def build_review_manifest(review_root: Path, *, workspace_root: Path, reviews_path: Path) -> dict[str, Any]:
    review_root = review_root.resolve()
    workspace_root = workspace_root.resolve()
    index_path = review_root / "index.json"
    if not index_path.exists():
        raise FileNotFoundError(f"missing review crop index: {index_path}")

    batch = _read_json(index_path)
    reviews = load_review_store(reviews_path)
    decisions = reviews.get("decisions", {})
    items: list[dict[str, Any]] = []
    crop_count = 0

    for payload_order, payload in enumerate(_iter_payload_summaries(batch)):
        pdf_stem = str(payload.get("pdf_stem") or f"payload_{payload_order + 1}")
        grouped: dict[int, list[dict[str, Any]]] = {}
        for record in _as_list(payload.get("records")):
            if not isinstance(record, dict):
                continue
            q_number = _as_int(record.get("q_number"))
            if q_number is None:
                continue
            grouped.setdefault(q_number, []).append(record)
            crop_count += 1

        for q_number in sorted(grouped):
            records = sorted(
                grouped[q_number],
                key=lambda record: (
                    _as_int(record.get("source_page_index")) or 0,
                    str(record.get("output_path") or ""),
                ),
            )
            image_missing = False
            images: list[dict[str, Any]] = []
            for record in records:
                media_path, exists = _record_media_relpath(
                    record,
                    review_root=review_root,
                    workspace_root=workspace_root,
                )
                source_page_index = _as_zero_based_index(record.get("source_page_index"))
                image_missing = image_missing or not exists
                images.append(
                    {
                        "media_path": media_path,
                        "exists": exists,
                        "source_page_index": source_page_index,
                        "pdf_page_number": source_page_index + 1 if source_page_index is not None else None,
                        "crop_box": _as_list(record.get("crop_box")),
                    }
                )

            item_id = f"{pdf_stem}:q{q_number:02d}"
            decision = decisions.get(item_id)
            items.append(
                {
                    "item_id": item_id,
                    "pdf_stem": pdf_stem,
                    "q_number": q_number,
                    "label": f"{pdf_stem} Q{q_number:02d}",
                    "images": images,
                    "warnings": _record_warnings(records, image_missing),
                    "status": decision.get("status") if isinstance(decision, dict) else "unreviewed",
                    "decision": decision if isinstance(decision, dict) else None,
                }
            )

    reviewed = sum(1 for item in items if item["status"] != "unreviewed")
    status_counts: dict[str, int] = {}
    for item in items:
        status_counts[item["status"]] = status_counts.get(item["status"], 0) + 1

    return {
        "schema_version": "question_crop_review_console_manifest_v1",
        "source_schema_version": batch.get("schema_version"),
        "review_root": str(review_root),
        "reviews_path": str(reviews_path),
        "totals": {
            "payloads": int(batch.get("payload_count") or len(_iter_payload_summaries(batch))),
            "questions": len(items),
            "crops": int(batch.get("crop_count") or crop_count),
            "reviewed": reviewed,
        },
        "status_counts": status_counts,
        "items": items,
    }


def resolve_media_path(review_root: Path, media_path: str) -> Path:
    root = review_root.resolve()
    requested = Path(unquote(media_path))
    if requested.is_absolute():
        raise ValueError("media path is outside review root")
    resolved = (root / requested).resolve()
    if not _is_relative_to(resolved, root):
        raise ValueError("media path is outside review root")
    return resolved


def _json_response(handler: BaseHTTPRequestHandler, status: HTTPStatus, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _text_response(handler: BaseHTTPRequestHandler, status: HTTPStatus, body: str, content_type: str) -> None:
    encoded = body.encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", content_type)
    handler.send_header("Content-Length", str(len(encoded)))
    handler.end_headers()
    handler.wfile.write(encoded)


def _send_bytes_response(handler: BaseHTTPRequestHandler, body: bytes, content_type: str) -> None:
    handler.send_response(HTTPStatus.OK)
    handler.send_header("Content-Type", content_type)
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store, max-age=0")
    handler.end_headers()
    handler.wfile.write(body)


def _html() -> str:
    return r"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Question Crop Review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --ink: #172033;
      --muted: #667085;
      --line: #d9dee8;
      --accent: #2563eb;
      --pass: #147d64;
      --fail: #c2410c;
      --review: #7c3aed;
      --skip: #64748b;
      --warn: #b45309;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    button, input, textarea, select { font: inherit; }
    .shell {
      display: grid;
      grid-template-columns: 340px minmax(0, 1fr);
      height: 100vh;
      min-height: 0;
      overflow: hidden;
    }
    .sidebar {
      border-right: 1px solid var(--line);
      background: var(--panel);
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      height: 100vh;
      min-height: 0;
    }
    .brand {
      padding: 18px 18px 14px;
      border-bottom: 1px solid var(--line);
    }
    .brand h1 {
      margin: 0;
      font-size: 18px;
      line-height: 1.25;
      font-weight: 720;
    }
    .brand p {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      word-break: break-all;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--line);
    }
    .stat {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px;
      min-width: 0;
    }
    .stat strong {
      display: block;
      font-size: 17px;
      line-height: 1;
    }
    .stat span {
      display: block;
      margin-top: 5px;
      color: var(--muted);
      font-size: 11px;
      white-space: nowrap;
    }
    .queue-tools {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 112px;
      gap: 8px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--line);
    }
    .queue-tools input, .queue-tools select, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      padding: 9px 10px;
      outline: none;
    }
    .queue-tools input:focus, .queue-tools select:focus, textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
    .queue {
      overflow: auto;
      padding: 10px;
    }
    .queue button {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--ink);
      padding: 10px;
      text-align: left;
      cursor: pointer;
    }
    .queue button:hover { background: #eef2f7; }
    .queue button.active {
      border-color: rgba(37, 99, 235, 0.45);
      background: #eaf1ff;
    }
    .queue .label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 650;
    }
    .queue .sub {
      grid-column: 1 / -1;
      color: var(--muted);
      font-size: 11px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 64px;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 680;
      color: #fff;
      background: var(--skip);
    }
    .pill.unreviewed { background: #94a3b8; }
    .pill.pass { background: var(--pass); }
    .pill.fail { background: var(--fail); }
    .pill.review { background: var(--review); }
    .pill.skip { background: var(--skip); }
    .main {
      min-width: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      height: 100vh;
      min-height: 0;
    }
    .topbar {
      border-bottom: 1px solid var(--line);
      background: var(--panel);
      display: grid;
      grid-template-columns: minmax(220px, 1fr) auto auto;
      gap: 12px;
      align-items: center;
      padding: 14px 18px;
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .title h2 {
      margin: 0;
      font-size: 20px;
      line-height: 1.2;
    }
    .title p {
      margin: 5px 0 0;
      color: var(--muted);
      font-size: 12px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .toolbar button, .actions button {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      padding: 9px 12px;
      cursor: pointer;
      font-weight: 650;
      min-width: 44px;
    }
    .toolbar button:hover, .actions button:hover { border-color: var(--accent); }
    .actions button.pass { background: var(--pass); border-color: var(--pass); color: #fff; }
    .actions button.fail { background: var(--fail); border-color: var(--fail); color: #fff; }
    .actions button.review { background: var(--review); border-color: var(--review); color: #fff; }
    .actions button.skip { background: var(--skip); border-color: var(--skip); color: #fff; }
    .viewer {
      overflow: auto;
      padding: 18px;
      background:
        linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
        linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px);
      background-size: 28px 28px;
    }
    .image-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 18px;
      align-items: start;
    }
    .image-frame {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }
    .image-frame header {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 10px;
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }
    .image-frame img {
      width: 100%;
      display: block;
      transform-origin: top left;
      background: #fff;
    }
    .image-frame.missing {
      padding: 22px;
      color: var(--fail);
      font-weight: 650;
    }
    .bottom {
      border-top: 1px solid var(--line);
      background: var(--panel);
      padding: 14px 18px;
    }
    .note label {
      display: block;
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 6px;
    }
    textarea {
      min-height: 74px;
      resize: vertical;
    }
    .flags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .flags label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 9px;
      background: #fff;
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
      min-width: 310px;
    }
    .empty {
      padding: 40px;
      text-align: center;
      color: var(--muted);
    }
    .warn {
      color: var(--warn);
      font-weight: 700;
    }
    @media (max-width: 980px) {
      .shell { grid-template-columns: 1fr; overflow: auto; }
      .sidebar { min-height: auto; max-height: 46vh; border-right: 0; border-bottom: 1px solid var(--line); }
      .main { min-height: 54vh; }
      .topbar { grid-template-columns: 1fr; }
      .toolbar, .actions { justify-content: flex-start; min-width: 0; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <h1>Question Crop Review</h1>
        <p id="reviewRoot"></p>
      </div>
      <div class="stats">
        <div class="stat"><strong id="statQuestions">0</strong><span>Questions</span></div>
        <div class="stat"><strong id="statCrops">0</strong><span>Crops</span></div>
        <div class="stat"><strong id="statDone">0</strong><span>Reviewed</span></div>
        <div class="stat"><strong id="statLeft">0</strong><span>Left</span></div>
      </div>
      <div class="queue-tools">
        <input id="search" type="search" placeholder="Search PDF or question">
        <select id="filter">
          <option value="all">All</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="warnings">Warnings</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="review">Review</option>
          <option value="skip">Skip</option>
        </select>
      </div>
      <div class="queue" id="queue"></div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="title">
          <h2 id="itemTitle">Loading</h2>
          <p id="itemMeta"></p>
        </div>
        <div class="toolbar">
          <button id="prev" title="Previous">Prev</button>
          <button id="next" title="Next">Next</button>
          <button id="zoomOut" title="Zoom out">-</button>
          <button id="zoomIn" title="Zoom in">+</button>
          <button id="resetZoom" title="Reset zoom">100%</button>
        </div>
        <div class="actions">
          <button class="pass" data-status="pass">Pass</button>
          <button class="fail" data-status="fail">Fail</button>
          <button class="review" data-status="review">Review</button>
          <button class="skip" data-status="skip">Skip</button>
        </div>
      </header>
      <section class="viewer">
        <div id="images" class="image-strip"></div>
      </section>
      <footer class="bottom">
        <div class="note">
          <label for="note">Notes</label>
          <textarea id="note" placeholder="Optional notes for this question"></textarea>
          <div class="flags">
            <label><input type="checkbox" value="cutoff"> Cut off</label>
            <label><input type="checkbox" value="wrong_question"> Wrong question</label>
            <label><input type="checkbox" value="too_tight"> Too tight</label>
            <label><input type="checkbox" value="too_much_context"> Too much context</label>
            <label><input type="checkbox" value="blank_or_noise"> Blank/noise</label>
          </div>
        </div>
      </footer>
    </main>
  </div>
  <script>
    const state = { manifest: null, items: [], filtered: [], selected: 0, zoom: 1 };
    const els = {
      reviewRoot: document.querySelector('#reviewRoot'),
      queue: document.querySelector('#queue'),
      search: document.querySelector('#search'),
      filter: document.querySelector('#filter'),
      title: document.querySelector('#itemTitle'),
      meta: document.querySelector('#itemMeta'),
      images: document.querySelector('#images'),
      note: document.querySelector('#note'),
      statQuestions: document.querySelector('#statQuestions'),
      statCrops: document.querySelector('#statCrops'),
      statDone: document.querySelector('#statDone'),
      statLeft: document.querySelector('#statLeft'),
      flags: Array.from(document.querySelectorAll('.flags input')),
    };

    function statusLabel(status) {
      return status === 'unreviewed' ? 'Open' : status;
    }

    function currentItem() {
      return state.filtered[state.selected] || null;
    }

    function applyFilters() {
      const term = els.search.value.trim().toLowerCase();
      const filter = els.filter.value;
      state.filtered = state.items.filter((item) => {
        const matchesTerm = !term || item.label.toLowerCase().includes(term) || item.pdf_stem.toLowerCase().includes(term);
        const matchesFilter =
          filter === 'all' ||
          item.status === filter ||
          (filter === 'warnings' && item.warnings.length > 0);
        return matchesTerm && matchesFilter;
      });
      state.selected = Math.min(state.selected, Math.max(0, state.filtered.length - 1));
      render();
    }

    function renderStats() {
      const totals = state.manifest.totals;
      els.statQuestions.textContent = totals.questions;
      els.statCrops.textContent = totals.crops;
      els.statDone.textContent = totals.reviewed;
      els.statLeft.textContent = Math.max(0, totals.questions - totals.reviewed);
      els.reviewRoot.textContent = state.manifest.review_root;
    }

    function renderQueue() {
      els.queue.innerHTML = '';
      if (!state.filtered.length) {
        els.queue.innerHTML = '<div class="empty">No matching questions</div>';
        return;
      }
      state.filtered.forEach((item, index) => {
        const button = document.createElement('button');
        button.className = index === state.selected ? 'active' : '';
        button.innerHTML = `
          <span class="label">${item.label}</span>
          <span class="pill ${item.status}">${statusLabel(item.status)}</span>
          <span class="sub">${item.images.length} image${item.images.length === 1 ? '' : 's'} ${item.warnings.length ? '<span class="warn">Warning</span>' : ''}</span>
        `;
        button.addEventListener('click', () => {
          state.selected = index;
          state.zoom = 1;
          render();
        });
        els.queue.appendChild(button);
      });
    }

    function renderItem() {
      const item = currentItem();
      els.images.innerHTML = '';
      if (!item) {
        els.title.textContent = 'No question selected';
        els.meta.textContent = '';
        els.note.value = '';
        return;
      }
      els.title.textContent = item.label;
      els.meta.textContent = `${item.images.length} image(s) | ${item.warnings.length ? item.warnings.join(', ') : 'no warnings'} | ${statusLabel(item.status)}`;
      els.note.value = item.decision?.note || '';
      const selectedFlags = new Set(item.decision?.flags || []);
      els.flags.forEach((flag) => { flag.checked = selectedFlags.has(flag.value); });
      item.images.forEach((image, idx) => {
        if (!image.exists || !image.media_path) {
          const missing = document.createElement('div');
          missing.className = 'image-frame missing';
          missing.textContent = `Missing image: ${image.media_path || idx + 1}`;
          els.images.appendChild(missing);
          return;
        }
        const frame = document.createElement('article');
        frame.className = 'image-frame';
        frame.innerHTML = `
          <header>
            <span>PDF page ${image.pdf_page_number ?? ''}</span>
            <span>${image.crop_box.join(', ')}</span>
          </header>
          <img src="/media/${encodeURI(image.media_path)}" alt="${item.label} page ${idx + 1}">
        `;
        frame.querySelector('img').style.transform = `scale(${state.zoom})`;
        frame.querySelector('img').style.width = `${100 / state.zoom}%`;
        els.images.appendChild(frame);
      });
    }

    function render() {
      renderStats();
      renderQueue();
      renderItem();
    }

    async function loadManifest(keepItemId = null) {
      const response = await fetch('/api/manifest');
      if (!response.ok) throw new Error(await response.text());
      state.manifest = await response.json();
      state.items = state.manifest.items;
      state.filtered = state.items;
      if (keepItemId) {
        const idx = state.filtered.findIndex((item) => item.item_id === keepItemId);
        state.selected = idx >= 0 ? idx : state.selected;
      }
      applyFilters();
    }

    async function save(status) {
      const item = currentItem();
      if (!item) return;
      const flags = els.flags.filter((flag) => flag.checked).map((flag) => flag.value);
      const response = await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.item_id,
          pdf_stem: item.pdf_stem,
          q_number: item.q_number,
          status,
          flags,
          note: els.note.value,
        }),
      });
      if (!response.ok) {
        alert(await response.text());
        return;
      }
      const keep = item.item_id;
      await loadManifest(keep);
      move(1);
    }

    function move(delta) {
      if (!state.filtered.length) return;
      state.selected = Math.max(0, Math.min(state.filtered.length - 1, state.selected + delta));
      state.zoom = 1;
      render();
    }

    document.querySelector('#prev').addEventListener('click', () => move(-1));
    document.querySelector('#next').addEventListener('click', () => move(1));
    document.querySelector('#zoomOut').addEventListener('click', () => { state.zoom = Math.max(0.35, state.zoom - 0.15); renderItem(); });
    document.querySelector('#zoomIn').addEventListener('click', () => { state.zoom = Math.min(2.5, state.zoom + 0.15); renderItem(); });
    document.querySelector('#resetZoom').addEventListener('click', () => { state.zoom = 1; renderItem(); });
    document.querySelectorAll('.actions button').forEach((button) => {
      button.addEventListener('click', () => save(button.dataset.status));
    });
    els.search.addEventListener('input', applyFilters);
    els.filter.addEventListener('change', applyFilters);
    document.addEventListener('keydown', (event) => {
      if (event.target.matches('textarea,input,select')) return;
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
      if (event.key === '1') save('pass');
      if (event.key === '2') save('fail');
      if (event.key === '3') save('review');
      if (event.key === '4') save('skip');
    });

    loadManifest().catch((error) => {
      els.title.textContent = 'Failed to load manifest';
      els.meta.textContent = error.message;
    });
  </script>
</body>
</html>
"""


def create_handler(review_root: Path, workspace_root: Path, reviews_path: Path) -> type[BaseHTTPRequestHandler]:
    class ReviewHandler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: Any) -> None:
            print(f"{self.address_string()} - {format % args}")

        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            try:
                if parsed.path in ("/", "/index.html"):
                    _text_response(self, HTTPStatus.OK, _html(), "text/html; charset=utf-8")
                    return
                if parsed.path == "/api/manifest":
                    payload = build_review_manifest(
                        review_root,
                        workspace_root=workspace_root,
                        reviews_path=reviews_path,
                    )
                    _json_response(self, HTTPStatus.OK, payload)
                    return
                if parsed.path == "/api/reviews":
                    _json_response(self, HTTPStatus.OK, load_review_store(reviews_path))
                    return
                if parsed.path.startswith("/media/"):
                    media_path = resolve_media_path(review_root, parsed.path[len("/media/") :])
                    if not media_path.exists() or not media_path.is_file():
                        _json_response(self, HTTPStatus.NOT_FOUND, {"error": "media not found"})
                        return
                    content_type = mimetypes.guess_type(media_path.name)[0] or "application/octet-stream"
                    body = media_path.read_bytes()
                    _send_bytes_response(self, body, content_type)
                    return
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": "not found"})
            except Exception as exc:  # pragma: no cover - defensive server boundary
                _json_response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path != "/api/decision":
                _json_response(self, HTTPStatus.NOT_FOUND, {"error": "not found"})
                return
            try:
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length).decode("utf-8")
                decision = json.loads(body or "{}")
                store = save_decision(reviews_path, decision, source_root=review_root.resolve())
                _json_response(self, HTTPStatus.OK, store)
            except ValueError as exc:
                _json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            except Exception as exc:  # pragma: no cover - defensive server boundary
                _json_response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

    return ReviewHandler


def serve_console(review_root: Path, *, workspace_root: Path, reviews_path: Path, host: str, port: int) -> None:
    handler = create_handler(review_root.resolve(), workspace_root.resolve(), reviews_path.resolve())
    server = ThreadingHTTPServer((host, port), handler)
    actual_host, actual_port = server.server_address
    print(f"Question crop review console: http://{actual_host}:{actual_port}", flush=True)
    print(f"Review root: {review_root.resolve()}", flush=True)
    print(f"Decisions: {reviews_path.resolve()}", flush=True)
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve a local browser console for question crop review")
    parser.add_argument(
        "--root",
        default="tmp/pdf-page-chain/pilot-20/question-review-crops",
        help="Directory containing the batch question-review-crops index.json",
    )
    parser.add_argument("--workspace-root", default=".", help="Workspace root used to resolve legacy output_path values")
    parser.add_argument("--reviews-path", default="", help="Where review-decisions.json should be written")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    review_root = Path(args.root).resolve()
    workspace_root = Path(args.workspace_root).resolve()
    reviews_path = Path(args.reviews_path).resolve() if args.reviews_path else review_root / "review-decisions.json"
    build_review_manifest(review_root, workspace_root=workspace_root, reviews_path=reviews_path)
    serve_console(review_root, workspace_root=workspace_root, reviews_path=reviews_path, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
