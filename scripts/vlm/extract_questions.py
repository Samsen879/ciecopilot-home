#!/usr/bin/env python3
"""
extract_questions.py - VLM extraction for question images

Usage:
    python extract_questions.py --manifest manifest.json --output out.jsonl [--provider mock]
    python extract_questions.py --assets-root /path/to/assets --output out.jsonl [--limit 20]
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.vlm.contracts import QuestionDescriptionV0, leakage_guard, validate_sha256
from scripts.vlm.providers import get_provider

QUESTION_ASSET_TYPES = {"question_img", "ms_question_img"}
# Match: 9231/s16_qp_11/... or 9231/WM_9231_s20_qp_11/...
STORAGE_KEY_RE = re.compile(r"^(\d{4})/(?:WM_\d{4}_)?([swm])(\d{2})_(qp|ms)_(\d)(\d)/")


def parse_storage_key(key: str) -> dict:
    """Extract metadata from storage_key."""
    m = STORAGE_KEY_RE.match(key)
    if not m:
        return {}
    return {
        "syllabus_code": m.group(1),
        "session": m.group(2),
        "year": 2000 + int(m.group(3)),
        "doc_type": m.group(4),
        "paper": int(m.group(5)),
        "variant": int(m.group(6)),
    }


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest_assets(manifest_path: Path) -> list[dict]:
    """Load question assets from manifest.json."""
    with open(manifest_path) as f:
        data = json.load(f)
    return [a for a in data.get("assets", []) if a.get("asset_type") in QUESTION_ASSET_TYPES]


def scan_assets_root(root: Path, limit: int | None = None) -> list[dict]:
    """Scan ASSETS_ROOT for question images, return asset dicts."""
    assets = []
    for img in sorted(root.rglob("questions/*.png")):
        storage_key = str(img.relative_to(root))
        assets.append({
            "storage_key": storage_key,
            "sha256": sha256_file(img),
            "asset_type": "question_img",
            "_path": str(img),
        })
        if limit and len(assets) >= limit:
            break
    return assets


def load_existing(output_path: Path) -> set[str]:
    """Load existing sha256 from output file for idempotency."""
    if not output_path.exists():
        return set()
    seen = set()
    with open(output_path) as f:
        for line in f:
            if line.strip():
                try:
                    d = json.loads(line)
                    seen.add(d.get("sha256", ""))
                except json.JSONDecodeError:
                    pass
    return seen


def process(assets: list[dict], provider, assets_root: Path | None, existing: set[str]) -> tuple[list[dict], dict]:
    """Process assets, return (results, stats)."""
    stats = {"processed": 0, "skipped": 0, "blocked": 0, "errors": 0}
    results = []
    
    for asset in assets:
        sha = asset.get("sha256", "")
        if sha in existing:
            stats["skipped"] += 1
            continue
        
        # Resolve image path
        if "_path" in asset:
            img_path = Path(asset["_path"])
        elif assets_root:
            img_path = assets_root / asset["storage_key"]
        else:
            stats["errors"] += 1
            continue
        
        if not img_path.exists():
            stats["errors"] += 1
            continue
        
        try:
            extracted = provider.generate(img_path)
        except Exception as e:
            stats["errors"] += 1
            continue
        
        # Build result
        meta = parse_storage_key(asset["storage_key"])
        data = {
            "storage_key": asset["storage_key"],
            "sha256": sha,
            **meta,
            **extracted,
            "status": "ok",
            "errors": [],
        }
        
        # Apply leakage guard
        data = leakage_guard(data)
        if data["status"] == "blocked":
            stats["blocked"] += 1
        else:
            stats["processed"] += 1
        
        results.append(data)
    
    return results, stats


def main():
    parser = argparse.ArgumentParser(description="VLM extraction for question images")
    parser.add_argument("--manifest", type=Path, help="Path to manifest.json")
    parser.add_argument("--assets-root", type=Path, help="Path to ASSETS_ROOT")
    parser.add_argument("--output", "-o", type=Path, required=True, help="Output JSONL file")
    parser.add_argument("--provider", default="mock", help="VLM provider name")
    parser.add_argument("--limit", type=int, help="Limit number of assets to process")
    args = parser.parse_args()
    
    if not args.manifest and not args.assets_root:
        parser.error("Either --manifest or --assets-root required")
    
    # Load assets
    if args.manifest:
        assets = load_manifest_assets(args.manifest)
        assets_root = args.manifest.parent
    else:
        assets = scan_assets_root(args.assets_root, args.limit)
        assets_root = args.assets_root
    
    if args.limit:
        assets = assets[:args.limit]
    
    # Load existing for idempotency
    existing = load_existing(args.output)
    
    # Process
    provider = get_provider(args.provider)
    results, stats = process(assets, provider, assets_root, existing)
    
    # Write output (append mode for idempotency)
    with open(args.output, "a") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    
    # Print stats
    print(f"Stats: processed={stats['processed']} skipped={stats['skipped']} blocked={stats['blocked']} errors={stats['errors']}")


if __name__ == "__main__":
    main()
