#!/usr/bin/env python3
import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
API_DIR = ROOT / "api"
OUT = ROOT / "runs" / "backend" / "backend_consistency_summary.json"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def iter_js_files():
    for p in API_DIR.rglob("*.js"):
        if "__tests__" in p.parts:
            continue
        if "node_modules" in p.parts:
            continue
        yield p


def main():
    supabase_sites = []
    vite_env_sites = []
    error_shape_warnings = []

    create_client_pattern = re.compile(r"\bcreateClient\s*\(")
    vite_env_pattern = re.compile(r"process\.env\.(VITE_[A-Z0-9_]+)")
    error_object_pattern = re.compile(r"\.json\(\s*\{\s*error\s*:\s*")

    for file_path in iter_js_files():
        text = file_path.read_text(encoding="utf-8")
        rel = str(file_path.relative_to(ROOT)).replace("\\", "/")

        if rel == "api/lib/supabase/client.js":
            # Factory implementation intentionally contains createClient.
            continue

        if create_client_pattern.search(text):
            uses_factory = "api/lib/supabase/client.js" in text or "../lib/supabase/client.js" in text
            supabase_sites.append(
                {
                    "file": rel,
                    "uses_factory": uses_factory,
                }
            )

        for match in vite_env_pattern.finditer(text):
            vite_env_sites.append(
                {
                    "file": rel,
                    "env_var": match.group(1),
                }
            )

        if error_object_pattern.search(text) and "code:" not in text:
            error_shape_warnings.append(
                {
                    "file": rel,
                    "issue": "error response may not include code field",
                }
            )

    non_factory_sites = [s for s in supabase_sites if not s["uses_factory"]]
    issue_counts = {
        "non_factory_supabase_sites": len(non_factory_sites),
        "vite_env_sites": len(vite_env_sites),
        "error_envelope_warnings": len(error_shape_warnings),
    }
    # Advisory by default: PASS only when all consistency issues are cleared.
    status = "pass" if all(value == 0 for value in issue_counts.values()) else "warn"
    upgrade_required_ready = status == "pass"

    payload = {
        "generated_at": utc_now(),
        "status": status,
        "upgrade_required_ready": upgrade_required_ready,
        "issue_counts": issue_counts,
        "supabase_initialization": {
            "total_sites": len(supabase_sites),
            "non_factory_sites": non_factory_sites,
        },
        "vite_env_usage": {
            "count": len(vite_env_sites),
            "sites": vite_env_sites,
        },
        "error_envelope_warnings": {
            "count": len(error_shape_warnings),
            "sites": error_shape_warnings,
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main()
