#!/usr/bin/env python3
"""Seed minimal A1 gate fixture data into the CI database.

Creates required tables and inserts deterministic fixture rows for:
  - question_descriptions_prod_v1 (storage_key → paper lookup)
  - question_concept_links (primary links with strategy evidence)

Also generates the audit CSV at tests/fixtures/a1_gate_audit_sample.csv.
"""
from __future__ import annotations

import csv
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

AUDIT_CSV_PATH = PROJECT_ROOT / "tests" / "fixtures" / "a1_gate_audit_sample.csv"

DEFAULT_SOURCE = "a1_keyword_mapper_v1"

# Fixture rows: all designed to PASS the gate thresholds
# (precision >= 0.85, non_fallback_precision >= 0.90, unreadable <= 0.05)
FIXTURE_ROWS = [
    {
        "storage_key": "9709/s22/qp11/q01.png",
        "paper": 1,
        "strategy": "keyword_match",
        "node_path": "math/algebra/quadratics",
        "verdict": "correct",
        "node_id": "11111111-1111-4111-8111-111111111111",
        "topic_path_ltree": "math.algebra.quadratics",
    },
    {
        "storage_key": "9709/s22/qp11/q02.png",
        "paper": 1,
        "strategy": "keyword_match",
        "node_path": "math/calculus/differentiation",
        "verdict": "correct",
        "node_id": "11111111-1111-4111-8111-111111111112",
        "topic_path_ltree": "math.calculus.differentiation",
    },
    {
        "storage_key": "9709/s22/qp11/q03.png",
        "paper": 1,
        "strategy": "keyword_match",
        "node_path": "math/calculus/integration",
        "verdict": "correct",
        "node_id": "11111111-1111-4111-8111-111111111113",
        "topic_path_ltree": "math.calculus.integration",
    },
    {
        "storage_key": "9709/s22/qp31/q01.png",
        "paper": 3,
        "strategy": "keyword_match",
        "node_path": "math/algebra/partial_fractions",
        "verdict": "correct",
        "node_id": "11111111-1111-4111-8111-111111111114",
        "topic_path_ltree": "math.algebra.partial_fractions",
    },
    {
        "storage_key": "9709/s22/qp31/q02.png",
        "paper": 3,
        "strategy": "paper_fallback",
        "node_path": "math/trigonometry/identities",
        "verdict": "fallback_acceptable",
        "node_id": "11111111-1111-4111-8111-111111111115",
        "topic_path_ltree": "math.trigonometry.identities",
    },
]


def get_db_url() -> str:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL"):
        val = os.environ.get(key)
        if val:
            return val
    return "postgresql://postgres:postgres@localhost:5432/postgres"


def seed_db(db_url: str) -> None:
    import psycopg2

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS ltree;")
            cur.execute("CREATE SCHEMA IF NOT EXISTS auth;")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS auth.users (
                    id UUID PRIMARY KEY,
                    email TEXT
                );
                """
            )

            # Create tables if not exist (CI may not have run migrations)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS public.question_descriptions_prod_v1 (
                    id SERIAL PRIMARY KEY,
                    storage_key TEXT NOT NULL,
                    paper INT,
                    created_at TIMESTAMPTZ DEFAULT now()
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS public.question_concept_links (
                    id SERIAL PRIMARY KEY,
                    storage_key TEXT NOT NULL,
                    node_id UUID,
                    link_type TEXT DEFAULT 'primary',
                    source TEXT,
                    evidence JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ DEFAULT now()
                );
            """)
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS public.curriculum_nodes (
                    node_id UUID PRIMARY KEY,
                    syllabus_code TEXT NOT NULL,
                    topic_path ltree NOT NULL,
                    title TEXT NOT NULL
                );
                """
            )

            for row in FIXTURE_ROWS:
                cur.execute(
                    """
                    INSERT INTO auth.users (id, email)
                    VALUES (%s, %s)
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    ("bbbbbbbb-2222-4000-8000-000000000001", "a1-fixture@example.com"),
                )
                cur.execute(
                    """
                    INSERT INTO public.curriculum_nodes (node_id, syllabus_code, topic_path, title)
                    VALUES (%s, '9709', %s::ltree, %s)
                    ON CONFLICT (node_id) DO NOTHING;
                    """,
                    (row["node_id"], row["topic_path_ltree"], row["node_path"]),
                )
                cur.execute(
                    """
                    INSERT INTO public.question_descriptions_prod_v1 (storage_key, paper)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING;
                    """,
                    (row["storage_key"], row["paper"]),
                )
                cur.execute(
                    """
                    INSERT INTO public.question_concept_links
                        (storage_key, node_id, link_type, source, evidence)
                    VALUES (%s, %s, 'primary', %s, %s)
                    ON CONFLICT DO NOTHING;
                    """,
                    (
                        row["storage_key"],
                        row["node_id"],
                        DEFAULT_SOURCE,
                        f'{{"strategy": "{row["strategy"]}", "node_path": "{row["node_path"]}"}}',
                    ),
                )

        conn.commit()
        print(f"[seed_a1] Seeded {len(FIXTURE_ROWS)} rows into DB")
    finally:
        conn.close()


def write_audit_csv() -> None:
    AUDIT_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with AUDIT_CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "storage_key",
                "paper",
                "predicted_strategy",
                "gold_primary_node_path",
                "gold_secondary_node_path",
                "verdict",
            ],
        )
        writer.writeheader()
        for row in FIXTURE_ROWS:
            writer.writerow({
                "storage_key": row["storage_key"],
                "paper": row["paper"],
                "predicted_strategy": row["strategy"],
                "gold_primary_node_path": row["node_path"],
                "gold_secondary_node_path": "",
                "verdict": row["verdict"],
            })
    print(f"[seed_a1] Wrote audit CSV: {AUDIT_CSV_PATH}")


def main() -> None:
    db_url = get_db_url()
    seed_db(db_url)
    write_audit_csv()
    print("[seed_a1] Done")


if __name__ == "__main__":
    main()
