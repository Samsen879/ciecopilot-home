#!/usr/bin/env python3
"""Sync screenshot files into canonical ASSETS_ROOT storage_key layout."""
from __future__ import annotations

import argparse
import hashlib
import os
import re
import shutil
from pathlib import Path


PAPER_DIR_RE = re.compile(
    r"^(?:WM_)?(?P<syllabus>\d{4})_(?P<session>[swm])(?P<year>\d{2})_(?P<doc_type>qp|ms)_(?P<paper>\d)(?P<variant>\d)$",
    re.IGNORECASE,
)
QUESTION_FILE_RE = re.compile(r"^q(\d{1,2})([a-z])?(?:_([ivx]+))?$", re.IGNORECASE)
PAGE_FILE_RE = re.compile(r"^page_(\d+)$", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Sync outputs/screenshots into ASSETS_ROOT canonical storage paths")
    p.add_argument("--screens-root", type=Path, default=Path("outputs/screenshots"))
    p.add_argument("--assets-root", type=Path, default=Path(os.environ.get("ASSETS_ROOT", r"C:\Users\Samsen\cie-assets")))
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--copy", action="store_true", help="Use copy instead of hardlink")
    p.add_argument("--verify-sha", action="store_true", help="Verify sha256 when destination exists")
    return p.parse_args()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def resolve_dest_rel(file: Path, storage_base: str) -> str | None:
    lname = file.name.lower()
    if file.suffix.lower() != ".png":
        return None
    if lname == "contact_sheet.png":
        return f"{storage_base}/contact_sheet.png"
    if PAGE_FILE_RE.match(file.stem):
        return f"{storage_base}/pages/{file.name}"
    if QUESTION_FILE_RE.match(file.stem):
        return f"{storage_base}/questions/{file.name}"
    return None


def main() -> int:
    args = parse_args()
    screens_root = args.screens_root
    assets_root = args.assets_root
    if not screens_root.exists():
        raise SystemExit(f"screens root not found: {screens_root}")

    stats = {
        "paper_dirs_detected": 0,
        "files_seen": 0,
        "candidate_assets": 0,
        "created": 0,
        "exists_same": 0,
        "exists_different": 0,
        "errors": 0,
    }

    for d in screens_root.rglob("*"):
        if not d.is_dir():
            continue
        m = PAPER_DIR_RE.match(d.name)
        if not m:
            continue
        stats["paper_dirs_detected"] += 1

        syllabus = m.group("syllabus")
        session = m.group("session").lower()
        year = m.group("year")
        doc_type = m.group("doc_type").lower()
        paper = m.group("paper")
        variant = m.group("variant")
        canonical_dir = f"{session}{year}_{doc_type}_{paper}{variant}"
        storage_base = f"{syllabus}/{canonical_dir}"

        for file in d.iterdir():
            if not file.is_file():
                continue
            stats["files_seen"] += 1
            rel = resolve_dest_rel(file, storage_base)
            if not rel:
                continue
            stats["candidate_assets"] += 1
            dst = assets_root / rel

            try:
                if dst.exists():
                    if args.verify_sha:
                        src_sha = sha256_file(file)
                        dst_sha = sha256_file(dst)
                        if src_sha == dst_sha:
                            stats["exists_same"] += 1
                        else:
                            stats["exists_different"] += 1
                    else:
                        stats["exists_same"] += 1
                    continue

                if args.dry_run:
                    stats["created"] += 1
                    continue

                dst.parent.mkdir(parents=True, exist_ok=True)
                if args.copy:
                    shutil.copy2(file, dst)
                else:
                    try:
                        os.link(file, dst)
                    except OSError:
                        shutil.copy2(file, dst)
                stats["created"] += 1
            except Exception:
                stats["errors"] += 1

    for k, v in stats.items():
        print(f"{k}={v}")
    print(f"screens_root={screens_root}")
    print(f"assets_root={assets_root}")
    print(f"mode={'dry-run' if args.dry_run else ('copy' if args.copy else 'hardlink_or_copy')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
