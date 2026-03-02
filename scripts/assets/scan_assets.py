#!/usr/bin/env python3
"""
scan_assets.py - 扫描资产目录并生成 manifest.json

用法:
    python scan_assets.py <ASSETS_ROOT> [--output manifest.json]
"""

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

PAPER_DIR_REGEX = re.compile(r"^([swm])(\d{2})_(qp|ms)_(\d)(\d)$")  # variant 1-6 per schema


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_paper_dir(dirname: str) -> dict | None:
    m = PAPER_DIR_REGEX.match(dirname)
    if not m:
        return None
    session, year, doc_type, paper, variant = m.groups()
    return {
        "session": session,
        "year": 2000 + int(year),
        "doc_type": doc_type,
        "paper": int(paper),
        "variant": int(variant),
    }


def parse_question_filename(filename: str) -> dict | None:
    stem = Path(filename).stem
    m = re.match(r"^q(\d{1,2})([a-z])?(?:_([ivx]+))?$", stem, re.IGNORECASE)
    if not m:
        return None
    q_num, part, roman = m.groups()
    subpart = None
    if part:
        subpart = part.lower()
        if roman:
            subpart += f"_{roman.lower()}"
    return {"q_number": int(q_num), "subpart": subpart}


def scan_paper_dir(paper_path: Path, syllabus_code: str) -> dict | None:
    dirname = paper_path.name
    meta = parse_paper_dir(dirname)
    if not meta:
        return None

    manifest = {
        "syllabus_code": syllabus_code,
        "year": meta["year"],
        "session": meta["session"],
        "paper": meta["paper"],
        "variant": meta["variant"],
        "doc_type": meta["doc_type"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "assets": [],
    }

    type_prefix = "qp" if meta["doc_type"] == "qp" else "ms"

    source_dir = paper_path / "source"
    if source_dir.exists():
        for f in source_dir.iterdir():
            if f.is_file() and f.suffix.lower() == ".pdf":
                manifest["source"] = {
                    "storage_key": f"{syllabus_code}/{dirname}/source/{f.name}",
                    "sha256": sha256_file(f),
                }

    pages_dir = paper_path / "pages"
    if pages_dir.exists():
        for f in sorted(pages_dir.iterdir()):
            if f.is_file() and f.suffix.lower() == ".png":
                page_match = re.match(r"page_(\d+)", f.stem)
                page_num = int(page_match.group(1)) if page_match else None
                manifest["assets"].append({
                    "asset_type": f"{type_prefix}_page",
                    "storage_key": f"{syllabus_code}/{dirname}/pages/{f.name}",
                    "sha256": sha256_file(f),
                    "page_number": page_num,
                    "file_size": f.stat().st_size,
                })

    questions_dir = paper_path / "questions"
    if questions_dir.exists():
        for f in sorted(questions_dir.iterdir()):
            if f.is_file() and f.suffix.lower() == ".png":
                q_info = parse_question_filename(f.name)
                asset = {
                    "asset_type": f"{type_prefix}_question_img" if type_prefix == "ms" else "question_img",
                    "storage_key": f"{syllabus_code}/{dirname}/questions/{f.name}",
                    "sha256": sha256_file(f),
                    "file_size": f.stat().st_size,
                }
                if q_info:
                    asset["q_number"] = q_info["q_number"]
                    asset["subpart"] = q_info["subpart"]
                manifest["assets"].append(asset)

    return manifest


def scan_assets_root(assets_root: Path) -> tuple[list[dict], list[dict]]:
    """扫描资产根目录，返回 (manifests, skipped_paper_dirs)"""
    manifests = []
    skipped = []

    for item in sorted(assets_root.iterdir()):
        if not item.is_dir():
            continue
        syllabus_code = item.name
        
        # 检查 syllabus_code 是否为 4 位数字
        if not re.match(r"^\d{4}$", syllabus_code):
            skipped.append({"path": str(item), "reason": "syllabus_dir_invalid"})
            continue

        for paper_dir in sorted(item.iterdir()):
            if not paper_dir.is_dir():
                continue
            
            dirname = paper_dir.name
            rel_path = f"{syllabus_code}/{dirname}"
            
            # 检查目录名是否匹配正则
            if not PAPER_DIR_REGEX.match(dirname):
                skipped.append({"path": rel_path, "reason": "paper_dir_name_mismatch"})
                continue
            
            # 检查是否有 questions/ 或 pages/ 目录
            questions_dir = paper_dir / "questions"
            pages_dir = paper_dir / "pages"
            has_questions = questions_dir.exists() and questions_dir.is_dir()
            has_pages = pages_dir.exists() and pages_dir.is_dir()
            
            if not has_questions and not has_pages:
                skipped.append({"path": rel_path, "reason": "missing_questions_dir"})
                continue
            
            # 检查目录是否为空
            q_files = list(questions_dir.glob("*.png")) if has_questions else []
            p_files = list(pages_dir.glob("*.png")) if has_pages else []
            if not q_files and not p_files:
                skipped.append({"path": rel_path, "reason": "empty_asset_dir"})
                continue
            
            # 尝试生成 manifest
            try:
                manifest = scan_paper_dir(paper_dir, syllabus_code)
                if manifest:
                    manifests.append(manifest)
                else:
                    skipped.append({"path": rel_path, "reason": "parse_error", "detail": "scan_paper_dir returned None"})
            except Exception as e:
                skipped.append({"path": rel_path, "reason": "parse_error", "detail": str(e)})

    return manifests, skipped


def main():
    parser = argparse.ArgumentParser(description="扫描资产目录并生成 manifest")
    parser.add_argument("assets_root", type=Path, help="资产根目录路径")
    parser.add_argument("--output", "-o", type=Path, help="输出文件路径")
    args = parser.parse_args()

    if not args.assets_root.exists():
        print(f"错误: 目录不存在: {args.assets_root}", file=sys.stderr)
        sys.exit(1)

    manifests, skipped = scan_assets_root(args.assets_root)

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "assets_root": str(args.assets_root.resolve()),
        "total_papers": len(manifests),
        "skipped_count": len(skipped),
        "skipped_paper_dirs": skipped,
        "manifests": manifests,
    }

    # 控制台 summary
    print(f"Scanned: manifests={len(manifests)}, skipped={len(skipped)}", file=sys.stderr)

    json_str = json.dumps(output, indent=2, ensure_ascii=False)
    if args.output:
        args.output.write_text(json_str, encoding="utf-8")
        print(f"已写入: {args.output}", file=sys.stderr)
    else:
        print(json_str)


if __name__ == "__main__":
    main()
