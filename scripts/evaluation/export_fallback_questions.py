#!/usr/bin/env python3
"""Export paper_fallback + heuristic_fallback questions for AI agent reclassification."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.vlm.db_utils import connect

DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
OUTPUT_PATH = Path("data/eval/a1_fallback_questions_for_reclassification.json")


def load_env() -> None:
    load_project_env()



def ensure_db_url() -> None:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        if os.environ.get(key):
            return
    os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DB_URL


def main() -> int:
    load_env()
    ensure_db_url()

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    qcl.storage_key,
                    qd.paper::int AS paper,
                    COALESCE(qcl.evidence->>'strategy', '') AS strategy,
                    cn.topic_path AS predicted_node_path,
                    qcl.confidence,
                    LEFT(qd.summary, 500) AS description
                FROM public.question_concept_links qcl
                JOIN public.curriculum_nodes cn ON cn.node_id = qcl.node_id
                JOIN public.question_descriptions_prod_v1 qd ON qd.storage_key = qcl.storage_key
                WHERE qcl.source = 'a1_keyword_mapper_v1'
                  AND qcl.link_type = 'primary'
                  AND cn.syllabus_code = '9709'
                  AND cn.paper IN (1, 3)
                  AND (
                      COALESCE(qcl.evidence->>'strategy', '') = 'paper_fallback'
                      OR COALESCE(qcl.evidence->>'strategy', '') = 'heuristic_fallback'
                  )
                ORDER BY qd.paper, qcl.storage_key
            """)

            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]

    # Convert confidence to float for JSON
    for row in rows:
        if row.get("confidence") is not None:
            row["confidence"] = float(row["confidence"])

    output = {
        "description": "Fallback questions needing AI agent reclassification",
        "total": len(rows),
        "strategies": {},
        "papers": {},
        "questions": rows,
    }

    # Stats
    from collections import Counter
    strat_counts = Counter(r["strategy"] for r in rows)
    paper_counts = Counter(r["paper"] for r in rows)
    output["strategies"] = dict(strat_counts)
    output["papers"] = {str(k): v for k, v in paper_counts.items()}

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    print("exported: %d questions" % len(rows))
    print("strategies: %s" % dict(strat_counts))
    print("papers: %s" % {str(k): v for k, v in paper_counts.items()})
    print("output: %s" % OUTPUT_PATH)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
