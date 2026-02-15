#!/usr/bin/env python3
"""Seed minimal Phase1 E2E fixture data.

Runs after migration replay and inserts deterministic rows for:
  - auth.users (fixture user for FK)
  - question_descriptions_prod_v1 (A1 paper lookup)
  - curriculum_nodes + question_concept_links (A1 node mapping)
  - rubric_points (B1 ready rubric consumed by evaluate-v1)
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

RUBRIC_ID_1 = "aaaaaaaa-1111-4000-8000-000000000001"
RUBRIC_ID_2 = "aaaaaaaa-1111-4000-8000-000000000002"
USER_ID = "bbbbbbbb-2222-4000-8000-000000000001"
NODE_ID = "cccccccc-3333-4000-8000-000000000001"
STORAGE_KEY = "9709/s22/qp11/q01.png"
Q_NUMBER = 1
SUBPART = "a"

EXTRACTOR_VERSION = "v1"
PROVIDER = "openai"
MODEL = "gpt-4-turbo"
PROMPT_VERSION = "p1"
SOURCE_VERSION = f"{EXTRACTOR_VERSION}:{PROVIDER}:{MODEL}:{PROMPT_VERSION}"


def get_db_url() -> str:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        val = os.environ.get(key)
        if val:
            return val
    return "postgresql://postgres:postgres@localhost:5432/postgres"


def seed_db(db_url: str) -> None:
    import psycopg2

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            # Ensure auth/users exists for FK targets in plain-Postgres CI.
            cur.execute("CREATE SCHEMA IF NOT EXISTS auth;")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS auth.users (
                    id UUID PRIMARY KEY,
                    email TEXT
                );
                """
            )
            cur.execute(
                """
                INSERT INTO auth.users (id, email)
                VALUES (%s, %s)
                ON CONFLICT (id) DO NOTHING;
                """,
                (USER_ID, "phase1-e2e-fixture@example.com"),
            )

            # question_descriptions_prod_v1 is used by A1 gate; create minimal table if absent.
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS public.question_descriptions_prod_v1 (
                    storage_key TEXT PRIMARY KEY,
                    paper INT NOT NULL
                );
                """
            )
            cur.execute(
                """
                UPDATE public.question_descriptions_prod_v1
                SET paper = %s
                WHERE storage_key = %s;
                """,
                (1, STORAGE_KEY),
            )
            if cur.rowcount == 0:
                cur.execute(
                    """
                    INSERT INTO public.question_descriptions_prod_v1 (storage_key, paper)
                    VALUES (%s, %s);
                    """,
                    (STORAGE_KEY, 1),
                )

            # A1 fixtures: curriculum node + primary question link.
            cur.execute(
                """
                INSERT INTO public.curriculum_nodes (
                    node_id, syllabus_code, topic_path, title
                )
                VALUES (%s, %s, %s::ltree, %s)
                ON CONFLICT (topic_path)
                DO UPDATE SET
                    syllabus_code = EXCLUDED.syllabus_code,
                    title = EXCLUDED.title
                RETURNING node_id;
                """,
                (NODE_ID, "9709", "math.algebra.quadratics", "Quadratics"),
            )
            resolved_node_id = cur.fetchone()[0]
            cur.execute(
                """
                INSERT INTO public.question_concept_links (
                    storage_key, node_id, link_type, source, confidence, evidence
                )
                VALUES (%s, %s, 'primary', %s, 0.95, %s::jsonb)
                ON CONFLICT (storage_key, node_id, link_type)
                DO UPDATE SET
                    source = EXCLUDED.source,
                    confidence = EXCLUDED.confidence,
                    evidence = EXCLUDED.evidence,
                    updated_at = now();
                """,
                (
                    STORAGE_KEY,
                    resolved_node_id,
                    "a1_keyword_mapper_v1",
                    json.dumps(
                        {
                            "strategy": "keyword_match",
                            "node_path": "math/algebra/quadratics",
                        }
                    ),
                ),
            )

            # B1 fixtures: ready rubric points for a single version.
            rows = [
                (
                    RUBRIC_ID_1,
                    STORAGE_KEY,
                    Q_NUMBER,
                    SUBPART,
                    1,
                    "M1",
                    "M",
                    "Use correct quadratic method",
                    1,
                    [],
                    [],
                    "fp_phase1_e2e_1",
                ),
                (
                    RUBRIC_ID_2,
                    STORAGE_KEY,
                    Q_NUMBER,
                    SUBPART,
                    2,
                    "A1",
                    "A",
                    "Obtain correct final answer",
                    1,
                    ["M1"],
                    [RUBRIC_ID_1],
                    "fp_phase1_e2e_2",
                ),
            ]
            for (
                rubric_id,
                storage_key,
                q_number,
                subpart,
                step_index,
                mark_label,
                kind,
                description,
                marks,
                depends_on_labels,
                depends_on,
                fingerprint,
            ) in rows:
                cur.execute(
                    """
                    INSERT INTO public.rubric_points (
                        rubric_id,
                        storage_key,
                        paper_id,
                        q_number,
                        subpart,
                        step_index,
                        mark_label,
                        kind,
                        description,
                        marks,
                        depends_on_labels,
                        depends_on,
                        ft_mode,
                        expected_answer_latex,
                        confidence,
                        confidence_source,
                        status,
                        parse_flags,
                        source,
                        run_id,
                        extractor_version,
                        provider,
                        model,
                        prompt_version,
                        raw_json,
                        response_sha256,
                        point_fingerprint
                    )
                    VALUES (
                        %s, %s, NULL, %s, %s, %s, %s, %s, %s, %s,
                        %s::text[], %s::uuid[], 'none', NULL, 0.95, 'model',
                        'ready', '{}'::jsonb, 'vlm', NULL, %s, %s, %s, %s,
                        '{}'::jsonb, NULL, %s
                    )
                    ON CONFLICT (storage_key, q_number, COALESCE(subpart, ''), point_fingerprint, extractor_version, provider, model, prompt_version)
                    DO UPDATE SET
                        mark_label = EXCLUDED.mark_label,
                        kind = EXCLUDED.kind,
                        description = EXCLUDED.description,
                        marks = EXCLUDED.marks,
                        depends_on_labels = EXCLUDED.depends_on_labels,
                        depends_on = EXCLUDED.depends_on,
                        status = 'ready',
                        updated_at = now();
                    """,
                    (
                        rubric_id,
                        storage_key,
                        q_number,
                        subpart,
                        step_index,
                        mark_label,
                        kind,
                        description,
                        marks,
                        depends_on_labels,
                        depends_on,
                        EXTRACTOR_VERSION,
                        PROVIDER,
                        MODEL,
                        PROMPT_VERSION,
                        fingerprint,
                    ),
                )

            # Sanity check: ready view must be populated.
            cur.execute(
                """
                SELECT COUNT(*)
                FROM public.rubric_points_ready_v1
                WHERE storage_key = %s
                  AND q_number = %s
                  AND COALESCE(subpart,'') = %s
                  AND source_version = %s;
                """,
                (STORAGE_KEY, Q_NUMBER, SUBPART, SOURCE_VERSION),
            )
            ready_count = cur.fetchone()[0]
            if ready_count < 2:
                raise RuntimeError(
                    f"Expected >=2 ready rubric rows for fixture scope, got {ready_count}"
                )

        conn.commit()
        print("[seed_phase1_e2e] Seeded E2E fixture data")
        print(f"  user_id={USER_ID}")
        print(f"  storage_key={STORAGE_KEY}")
        print(f"  node_id={resolved_node_id}")
        print(f"  rubric_ids={RUBRIC_ID_1}, {RUBRIC_ID_2}")
        print(f"  source_version={SOURCE_VERSION}")
    finally:
        conn.close()


def main() -> None:
    seed_db(get_db_url())
    print("[seed_phase1_e2e] Done")


if __name__ == "__main__":
    main()
