#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONSISTENCY_FILE = ROOT / "runs" / "backend" / "backend_consistency_summary.json"
OUT = ROOT / "runs" / "backend" / "supabase_client_unification.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def main() -> None:
    if CONSISTENCY_FILE.exists():
        consistency = json.loads(CONSISTENCY_FILE.read_text(encoding="utf-8"))
        supabase = consistency.get("supabase_initialization", {})
        issue_counts = consistency.get("issue_counts", {})
    else:
        supabase = {"total_sites": 0, "non_factory_sites": []}
        issue_counts = {"non_factory_supabase_sites": 0}

    non_factory_sites = supabase.get("non_factory_sites", [])
    next_actions = (
        [
            "maintain factory-only policy in new api modules",
            "keep backend consistency gate as required signal in M2/M3",
        ]
        if len(non_factory_sites) == 0
        else [
            "replace direct createClient usage with getServiceClient/getAnonClient",
            "remove VITE_* server environment dependency in api modules",
        ]
    )
    payload = {
        "generated_at": utc_now(),
        "status": "pass" if len(non_factory_sites) == 0 else "in_progress",
        "total_create_client_sites": supabase.get("total_sites", 0),
        "non_factory_count": len(non_factory_sites),
        "issue_counts": issue_counts,
        "non_factory_sites": non_factory_sites,
        "next_actions": next_actions,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(str(OUT))


if __name__ == "__main__":
    main()
