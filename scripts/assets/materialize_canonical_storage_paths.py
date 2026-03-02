#!/usr/bin/env python3
"""Create canonical non-WM storage paths from existing WM_* paper folders."""
from __future__ import annotations

import argparse
import os
import re
import shutil
from pathlib import Path


PAPER_DIR_RE = re.compile(r"^WM_(?P<syllabus>\d{4})_(?P<canonical>[swm]\d{2}_(?:qp|ms)_\d\d)$", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Materialize non-WM canonical storage paths under ASSETS_ROOT")
    p.add_argument("--assets-root", type=Path, default=Path(os.environ.get("ASSETS_ROOT", r"C:\Users\Samsen\cie-assets")))
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--copy", action="store_true", help="Use copy instead of hardlink")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    root = args.assets_root
    if not root.exists():
        raise SystemExit(f"assets root not found: {root}")

    stats = {
        "papers_detected": 0,
        "files_seen": 0,
        "created": 0,
        "already_exists": 0,
        "source_missing": 0,
        "errors": 0,
    }

    for syllabus_dir in sorted(root.iterdir()):
        if not syllabus_dir.is_dir():
            continue
        syllabus = syllabus_dir.name
        if not re.match(r"^\d{4}$", syllabus):
            continue

        for paper_dir in sorted(syllabus_dir.iterdir()):
            if not paper_dir.is_dir():
                continue
            m = PAPER_DIR_RE.match(paper_dir.name)
            if not m:
                continue

            stats["papers_detected"] += 1
            canonical = m.group("canonical").lower()
            target_paper_dir = syllabus_dir / canonical

            for src in paper_dir.rglob("*"):
                if not src.is_file():
                    continue
                stats["files_seen"] += 1
                rel = src.relative_to(paper_dir)
                dst = target_paper_dir / rel

                if dst.exists():
                    stats["already_exists"] += 1
                    continue

                if not src.exists():
                    stats["source_missing"] += 1
                    continue

                if args.dry_run:
                    stats["created"] += 1
                    continue

                try:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    if args.copy:
                        shutil.copy2(src, dst)
                    else:
                        try:
                            os.link(src, dst)
                        except OSError:
                            shutil.copy2(src, dst)
                    stats["created"] += 1
                except Exception:
                    stats["errors"] += 1

    for k, v in stats.items():
        print(f"{k}={v}")
    print(f"assets_root={root}")
    print(f"mode={'dry-run' if args.dry_run else ('copy' if args.copy else 'hardlink_or_copy')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
