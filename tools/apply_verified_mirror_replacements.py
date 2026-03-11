from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repo_relative_or_fallback(repo_root: Path, path: Path) -> Path:
    try:
        return path.resolve().relative_to(repo_root.resolve())
    except Exception:
        return Path("external") / path.drive.replace(":", "") / path.as_posix().lstrip("/")


def load_clean_entries(audit_path: Path, source_variant: str) -> list[dict[str, Any]]:
    payload = json.loads(audit_path.read_text(encoding="utf-8"))
    entries = []
    for item in payload.get("per_pdf_results", []):
        if item.get("vlm_pdf_status") != "clean":
            continue
        entries.append(
            {
                "subject": item.get("subject"),
                "source_type": item.get("source_type"),
                "original_pdf_path": item["original_pdf_path"],
                "candidate_path": item["candidate_path"],
                "candidate_url": item.get("candidate_url"),
                "source_variant": source_variant,
                "candidate_page_count": item.get("candidate_page_count"),
                "page_class_counts": item.get("page_class_counts", {}),
                "vlm_pdf_status": item.get("vlm_pdf_status"),
            }
        )
    return entries


def load_non_clean_entries(audit_path: Path, source_variant: str) -> list[dict[str, Any]]:
    payload = json.loads(audit_path.read_text(encoding="utf-8"))
    entries = []
    for item in payload.get("per_pdf_results", []):
        if item.get("vlm_pdf_status") == "clean":
            continue
        entries.append(
            {
                "subject": item.get("subject"),
                "source_type": item.get("source_type"),
                "original_pdf_path": item["original_pdf_path"],
                "candidate_path": item["candidate_path"],
                "candidate_url": item.get("candidate_url"),
                "source_variant": source_variant,
                "candidate_page_count": item.get("candidate_page_count"),
                "page_class_counts": item.get("page_class_counts", {}),
                "vlm_pdf_status": item.get("vlm_pdf_status"),
                "non_clean_pages": item.get("non_clean_pages", []),
            }
        )
    return entries


def merge_replacement_entries(
    base_clean_entries: list[dict[str, Any]],
    stripped_clean_entries: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for entry in base_clean_entries + stripped_clean_entries:
        merged[str(Path(entry["original_pdf_path"]).resolve())] = entry
    return sorted(merged.values(), key=lambda item: (str(item.get("subject") or ""), item["original_pdf_path"]))


def build_holdout_entries(
    base_non_clean_entries: list[dict[str, Any]],
    stripped_clean_entries: list[dict[str, Any]],
    stripped_non_clean_entries: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    stripped_clean_paths = {
        str(Path(entry["original_pdf_path"]).resolve())
        for entry in stripped_clean_entries
    }
    holdouts: dict[str, dict[str, Any]] = {}
    for entry in base_non_clean_entries:
        original_path = str(Path(entry["original_pdf_path"]).resolve())
        if original_path in stripped_clean_paths:
            continue
        holdouts[original_path] = entry
    for entry in stripped_non_clean_entries:
        original_path = str(Path(entry["original_pdf_path"]).resolve())
        holdouts[original_path] = entry
    return sorted(holdouts.values(), key=lambda item: (str(item.get("subject") or ""), item["original_pdf_path"]))


def apply_replacements(
    repo_root: Path,
    replacements: list[dict[str, Any]],
    backup_root: Path,
) -> list[dict[str, Any]]:
    applied_entries = []
    ensure_dir(backup_root)

    for entry in replacements:
        original_path = Path(entry["original_pdf_path"]).resolve()
        candidate_path = Path(entry["candidate_path"]).resolve()
        backup_path = backup_root / repo_relative_or_fallback(repo_root, original_path)

        ensure_dir(original_path.parent)
        ensure_dir(backup_path.parent)

        backup_created = False
        if not backup_path.exists():
            shutil.copy2(original_path, backup_path)
            backup_created = True

        shutil.copy2(candidate_path, original_path)

        candidate_sha256 = sha256_file(candidate_path)
        original_sha256 = sha256_file(original_path)
        backup_sha256 = sha256_file(backup_path)

        applied_entries.append(
            {
                **entry,
                "backup_path": str(backup_path.resolve()),
                "backup_created": backup_created,
                "backup_sha256": backup_sha256,
                "candidate_sha256": candidate_sha256,
                "replaced_sha256": original_sha256,
                "replace_status": "applied" if candidate_sha256 == original_sha256 else "copy_mismatch",
            }
        )

    return applied_entries


def build_markdown(out_path: Path, payload: dict[str, Any]) -> None:
    summary = payload["summary"]
    lines = [
        "# Verified Mirror Replacement Report",
        "",
        f"- Generated at: {payload['generated_at']}",
        f"- Base audit: {payload['base_audit_path']}",
        f"- Stripped audit: {payload['stripped_audit_path']}",
        f"- Backup root: {payload['backup_root']}",
        "",
        "## Headline",
        "",
        f"- Base clean count: {summary['base_clean_count']}",
        f"- Stripped clean count: {summary['stripped_clean_count']}",
        f"- Replacement count: {summary['replacement_count']}",
        f"- Holdout count: {summary['holdout_count']}",
        f"- Applied count: {summary['applied_count']}",
        "",
        "## Holdouts",
        "",
    ]
    if payload["holdout_entries"]:
        for entry in payload["holdout_entries"][:40]:
            lines.append(
                f"- {entry['original_pdf_path']} | status={entry['vlm_pdf_status']} | source_variant={entry['source_variant']}"
            )
    else:
        lines.append("- None")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply unified replacement using VLM-verified clean mirror candidates.")
    parser.add_argument("--base-audit", default="runs/backend/rag_step3_pdf_mirror_vlm_audit.json")
    parser.add_argument("--stripped-audit", default="runs/backend/rag_step3_pdf_footer_stripped_vlm_audit.json")
    parser.add_argument("--backup-root", default="runs/backend/rag_step3_pdf_verified_replacement_backups")
    parser.add_argument("--out-json", default="runs/backend/rag_step3_pdf_verified_replacements.json")
    parser.add_argument("--out-md", default="docs/reports/rag_step3_pdf_verified_replacements.md")
    parser.add_argument("--apply", action="store_true", help="Actually replace original PDFs in place.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    base_audit_path = Path(args.base_audit)
    stripped_audit_path = Path(args.stripped_audit)
    backup_root = Path(args.backup_root)
    out_json = Path(args.out_json)
    out_md = Path(args.out_md)

    ensure_dir(out_json.parent)
    ensure_dir(out_md.parent)

    base_clean_entries = load_clean_entries(base_audit_path, "mirror_direct_clean")
    stripped_clean_entries = load_clean_entries(stripped_audit_path, "mirror_footer_stripped_clean")
    replacements = merge_replacement_entries(base_clean_entries, stripped_clean_entries)

    base_non_clean_entries = load_non_clean_entries(base_audit_path, "mirror_direct_candidate")
    stripped_non_clean_entries = load_non_clean_entries(stripped_audit_path, "mirror_footer_stripped_candidate")
    holdout_entries = build_holdout_entries(base_non_clean_entries, stripped_clean_entries, stripped_non_clean_entries)

    applied_entries: list[dict[str, Any]] = []
    if args.apply:
        applied_entries = apply_replacements(repo_root, replacements, backup_root)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_audit_path": str(base_audit_path.resolve()),
        "stripped_audit_path": str(stripped_audit_path.resolve()),
        "backup_root": str(backup_root.resolve()),
        "apply_mode": bool(args.apply),
        "summary": {
            "base_clean_count": len(base_clean_entries),
            "stripped_clean_count": len(stripped_clean_entries),
            "replacement_count": len(replacements),
            "holdout_count": len(holdout_entries),
            "applied_count": len(applied_entries),
        },
        "replacement_entries": applied_entries if args.apply else replacements,
        "holdout_entries": holdout_entries,
    }
    out_json.write_text(json_dumps(payload), encoding="utf-8")
    build_markdown(out_md, payload)
    print(json_dumps(payload["summary"]))
    print(f"out_json={out_json.resolve()}")
    print(f"out_md={out_md.resolve()}")


if __name__ == "__main__":
    main()
