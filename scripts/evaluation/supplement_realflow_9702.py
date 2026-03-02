#!/usr/bin/env python3
"""Supplement realflow manifest with 9702 samples from screenshot assets.

Motivation:
- `question_descriptions_v0` currently has no 9702 rows.
- We still need representative 9702 coverage for realflow review.

This script appends 9702 samples sourced from `outputs/screenshots/ms/9702`
while excluding known anomaly files listed in `docs/ms_9702_review_queue.json`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict, deque
from pathlib import Path
from typing import Any


DIR_PATTERN = re.compile(r"^9702_([msw])(\d{2})_ms_(\d{2})$")
FILE_PATTERN = re.compile(r"^q(\d+)([a-z_0-9]*)\.png$")


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")


def normalize_rel_path(path: Path) -> str:
    return path.as_posix()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_anomaly_set(review_queue_path: Path) -> set[tuple[str, str]]:
    if not review_queue_path.exists():
        return set()
    payload = load_json(review_queue_path)
    queue = payload.get("queue", [])
    flagged: set[tuple[str, str]] = set()
    for item in queue:
        paper = str(item.get("paper", "")).replace("\\", "/").strip()
        file_name = str(item.get("file", "")).strip()
        if not paper or not file_name:
            continue
        flagged.add((paper, file_name))
    return flagged


def parse_q_file(file_name: str) -> tuple[int, str | None] | None:
    m = FILE_PATTERN.match(file_name)
    if not m:
        return None
    q_number = int(m.group(1))
    suffix = m.group(2).strip("_")
    subpart = suffix if suffix else None
    return q_number, subpart


def candidate_samples(
    assets_root: Path,
    anomaly_set: set[tuple[str, str]],
    existing_keys: set[str],
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for paper_dir in sorted(p for p in assets_root.iterdir() if p.is_dir()):
        m = DIR_PATTERN.match(paper_dir.name)
        if not m:
            continue
        session, year_short, paper_variant = m.group(1), m.group(2), m.group(3)
        year = 2000 + int(year_short)
        paper = int(paper_variant[0])
        variant = int(paper_variant[1])

        paper_rel = normalize_rel_path(paper_dir)
        for png in sorted(paper_dir.glob("q*.png")):
            parsed = parse_q_file(png.name)
            if not parsed:
                continue
            q_number, subpart = parsed

            if (paper_rel, png.name) in anomaly_set:
                continue

            storage_key = normalize_rel_path(png)
            if storage_key in existing_keys:
                continue

            out.append(
                {
                    "storage_key": storage_key,
                    "sha256": sha256_file(png),
                    "syllabus_code": "9702",
                    "year": year,
                    "session": session,
                    "paper": paper,
                    "variant": variant,
                    "q_number": q_number,
                    "subpart": subpart,
                    "extracted_question_type": "unknown",
                    "extracted_answer_form": "unknown",
                    "extracted_confidence": None,
                    "annotation_status": "pending",
                    "sample_source": "ms_screenshot_fallback",
                }
            )
    return out


def stratified_pick(candidates: list[dict[str, Any]], n: int) -> list[dict[str, Any]]:
    if n <= 0 or not candidates:
        return []

    by_bucket: dict[tuple[str, int], deque[dict[str, Any]]] = defaultdict(deque)
    for c in candidates:
        by_bucket[(c["session"], int(c["year"]))].append(c)

    buckets = sorted(by_bucket.keys(), key=lambda x: (x[1], x[0]))
    picked: list[dict[str, Any]] = []
    while len(picked) < n and buckets:
        next_buckets: list[tuple[str, int]] = []
        for b in buckets:
            q = by_bucket[b]
            if q:
                picked.append(q.popleft())
                if len(picked) >= n:
                    break
            if q:
                next_buckets.append(b)
        buckets = next_buckets
        if not buckets:
            break
    return picked


def recompute_stats(samples: list[dict[str, Any]]) -> dict[str, Any]:
    by_syllabus = Counter()
    by_year = Counter()
    by_session = Counter()
    by_type = Counter()
    for s in samples:
        by_syllabus[str(s.get("syllabus_code"))] += 1
        by_year[str(s.get("year"))] += 1
        by_session[str(s.get("session"))] += 1
        qtype = s.get("extracted_question_type")
        if qtype:
            by_type[str(qtype)] += 1
    return {
        "by_syllabus": dict(sorted(by_syllabus.items())),
        "by_year": dict(sorted(by_year.items(), key=lambda x: int(x[0]))),
        "by_session": dict(sorted(by_session.items())),
        "by_question_type": dict(sorted(by_type.items())),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Supplement 9702 into realflow manifest")
    parser.add_argument("--base", type=Path, required=True, help="Existing manifest JSON")
    parser.add_argument(
        "--assets-root",
        type=Path,
        default=Path("outputs/screenshots/ms/9702"),
        help="9702 screenshot root",
    )
    parser.add_argument(
        "--review-queue",
        type=Path,
        default=Path("docs/ms_9702_review_queue.json"),
        help="Anomaly queue JSON path",
    )
    parser.add_argument("--add", type=int, default=36, help="Number of 9702 samples to add")
    parser.add_argument("--out", type=Path, help="Output manifest path (default overwrite base)")
    args = parser.parse_args()

    if not args.base.exists():
        raise SystemExit(f"Base manifest not found: {args.base}")
    if not args.assets_root.exists():
        raise SystemExit(f"Assets root not found: {args.assets_root}")

    payload = load_json(args.base)
    samples = list(payload.get("samples", []))
    existing_keys = {str(s.get("storage_key")) for s in samples if s.get("storage_key")}

    anomaly_set = load_anomaly_set(args.review_queue)
    candidates = candidate_samples(args.assets_root, anomaly_set, existing_keys)
    picked = stratified_pick(candidates, args.add)

    merged = samples + picked
    payload["generated_at"] = __import__("datetime").datetime.now().isoformat()
    payload["total_samples"] = len(merged)
    payload["statistics"] = recompute_stats(merged)
    payload["samples"] = merged
    payload["supplement_info"] = {
        "strategy": "9702_ms_screenshot_fallback",
        "requested_add": args.add,
        "added": len(picked),
        "candidate_pool": len(candidates),
        "excluded_anomaly_count": len(anomaly_set),
        "assets_root": normalize_rel_path(args.assets_root),
        "review_queue": normalize_rel_path(args.review_queue),
    }

    out_path = args.out or args.base
    save_json(out_path, payload)

    by_syllabus = payload["statistics"]["by_syllabus"]
    print(f"output={out_path.as_posix()}")
    print(f"added={len(picked)}")
    print(f"total_samples={payload['total_samples']}")
    print(f"by_syllabus={json.dumps(by_syllabus, ensure_ascii=False)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
