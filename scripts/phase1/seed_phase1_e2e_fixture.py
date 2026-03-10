#!/usr/bin/env python3
"""Seed deterministic Phase1 E2E fixture data.

This script is intentionally strict about prerequisites:
- it requires the relevant relations to already exist
- it does not create fallback tables that would mask migration drift
- it writes a fixture manifest consumed by smoke, B3 verification, and summary steps
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.phase1.common import (
    RUN_DIR,
    load_env,
    relation_exists,
    require_db_url,
    utc_now_iso,
    write_json_file,
)

RUBRIC_ID_1 = "aaaaaaaa-1111-4000-8000-000000000001"
RUBRIC_ID_2 = "aaaaaaaa-1111-4000-8000-000000000002"
USER_ID = "bbbbbbbb-2222-4000-8000-000000000001"
NODE_ID = "cccccccc-3333-4000-8000-000000000001"
QUESTION_ID = "dddddddd-4444-4000-8000-000000000001"
STORAGE_KEY = "9709/s22/qp11/q01.png"
Q_NUMBER = 1
SUBPART = "a"
PAPER = 1
SYLLABUS_CODE = "9709"
TOPIC_PATH = "math.algebra.quadratics"
REQUEST_ID = "phase1-e2e-request-001"
RUN_IDEMPOTENCY_KEY = "phase1-e2e-run-001"

EXTRACTOR_VERSION = "v1"
PROVIDER = "openai"
MODEL = "gpt-4-turbo"
PROMPT_VERSION = "p1"
SOURCE_VERSION = f"{EXTRACTOR_VERSION}:{PROVIDER}:{MODEL}:{PROMPT_VERSION}"

MANIFEST_PATH = RUN_DIR / "phase1_e2e_fixture_manifest.json"
REQUIRED_RELATIONS = (
    "auth.users",
    "public.question_descriptions_prod_v1",
    "public.curriculum_nodes",
    "public.question_concept_links",
    "public.question_bank",
    "public.rubric_points",
    "public.rubric_points_ready_v1",
)
SMOKE_STEPS = [
    {"step_id": "s1", "text": "Use correct quadratic method"},
    {"step_id": "s2", "text": "Irrelevant sentence that should not match A1 strongly"},
]


def _verify_prerequisites(cur) -> None:
    missing = [name for name in REQUIRED_RELATIONS if not relation_exists(cur, name)]
    if missing:
        raise RuntimeError(
            "Missing prerequisite relation(s): " + ", ".join(missing)
        )


def _upsert_question_description(cur) -> None:
    cur.execute(
        """
        UPDATE public.question_descriptions_prod_v1
        SET paper = %s
        WHERE storage_key = %s;
        """,
        (PAPER, STORAGE_KEY),
    )
    if cur.rowcount == 0:
        cur.execute(
            """
            INSERT INTO public.question_descriptions_prod_v1 (storage_key, paper)
            VALUES (%s, %s);
            """,
            (STORAGE_KEY, PAPER),
        )


def _upsert_question_bank(cur) -> None:
    cur.execute(
        """
        INSERT INTO public.question_bank (
            question_id,
            paper_id,
            storage_key,
            q_number
        )
        VALUES (%s, NULL, %s, %s)
        ON CONFLICT (storage_key, q_number)
        DO UPDATE SET
            question_id = EXCLUDED.question_id,
            updated_at = now();
        """,
        (QUESTION_ID, STORAGE_KEY, Q_NUMBER),
    )


def _upsert_curriculum_mapping(cur) -> str:
    cur.execute(
        """
        INSERT INTO public.curriculum_nodes (
            node_id,
            syllabus_code,
            topic_path,
            title
        )
        VALUES (%s, %s, %s::ltree, %s)
        ON CONFLICT (topic_path)
        DO UPDATE SET
            syllabus_code = EXCLUDED.syllabus_code,
            title = EXCLUDED.title
        RETURNING node_id;
        """,
        (NODE_ID, SYLLABUS_CODE, TOPIC_PATH, "Quadratics"),
    )
    resolved_node_id = cur.fetchone()[0]
    cur.execute(
        """
        INSERT INTO public.question_concept_links (
            storage_key,
            node_id,
            link_type,
            source,
            confidence,
            evidence
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
                    "node_path": TOPIC_PATH.replace(".", "/"),
                }
            ),
        ),
    )
    return resolved_node_id


def _seed_auth_user(cur) -> None:
    cur.execute(
        """
        INSERT INTO auth.users (id, email)
        VALUES (%s, %s)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email;
        """,
        (USER_ID, "phase1-e2e-fixture@example.com"),
    )


def _upsert_rubric_points(cur) -> None:
    rows = [
        (
            RUBRIC_ID_1,
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
            ON CONFLICT (
                storage_key,
                q_number,
                COALESCE(subpart, ''),
                point_fingerprint,
                extractor_version,
                provider,
                model,
                prompt_version
            )
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
                STORAGE_KEY,
                Q_NUMBER,
                SUBPART,
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


def _collect_verification(cur, resolved_node_id: str) -> dict:
    cur.execute(
        """
        SELECT COUNT(*)
        FROM public.rubric_points_ready_v1
        WHERE storage_key = %s
          AND q_number = %s
          AND COALESCE(subpart, '') = %s
          AND source_version = %s;
        """,
        (STORAGE_KEY, Q_NUMBER, SUBPART, SOURCE_VERSION),
    )
    ready_count = cur.fetchone()[0]
    if ready_count < 2:
        raise RuntimeError(
            f"Expected >=2 ready rubric rows for fixture scope, got {ready_count}"
        )

    cur.execute(
        """
        SELECT COUNT(*)
        FROM public.question_concept_links
        WHERE storage_key = %s
          AND node_id = %s
          AND link_type = 'primary';
        """,
        (STORAGE_KEY, resolved_node_id),
    )
    primary_link_count = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM public.question_bank
        WHERE storage_key = %s
          AND q_number = %s
          AND question_id = %s;
        """,
        (STORAGE_KEY, Q_NUMBER, QUESTION_ID),
    )
    question_bank_count = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM public.question_descriptions_prod_v1
        WHERE storage_key = %s
          AND paper = %s;
        """,
        (STORAGE_KEY, PAPER),
    )
    description_count = cur.fetchone()[0]

    return {
        "ready_rubric_points_rows": ready_count,
        "primary_link_rows": primary_link_count,
        "question_bank_rows": question_bank_count,
        "question_description_rows": description_count,
    }


def _build_manifest(verification: dict, resolved_node_id: str) -> dict:
    return {
        "generated_at_utc": utc_now_iso(),
        "fixture_id": "phase1-e2e-v2",
        "user_id": USER_ID,
        "question_id": QUESTION_ID,
        "storage_key": STORAGE_KEY,
        "q_number": Q_NUMBER,
        "subpart": SUBPART,
        "paper": PAPER,
        "syllabus_code": SYLLABUS_CODE,
        "node_id": resolved_node_id,
        "topic_path": TOPIC_PATH,
        "rubric_ids": [RUBRIC_ID_1, RUBRIC_ID_2],
        "rubric_source_version": SOURCE_VERSION,
        "idempotency": {
            "request_id": REQUEST_ID,
            "run_idempotency_key": RUN_IDEMPOTENCY_KEY,
        },
        "smoke_request": {
            "storage_key": STORAGE_KEY,
            "q_number": Q_NUMBER,
            "subpart": SUBPART,
            "user_id": USER_ID,
            "student_steps": SMOKE_STEPS,
        },
        "verification": verification,
    }


def seed_db() -> dict:
    import psycopg2

    conn = psycopg2.connect(require_db_url())
    try:
        with conn.cursor() as cur:
            _verify_prerequisites(cur)
            _seed_auth_user(cur)
            _upsert_question_description(cur)
            _upsert_question_bank(cur)
            resolved_node_id = _upsert_curriculum_mapping(cur)
            _upsert_rubric_points(cur)
            verification = _collect_verification(cur, resolved_node_id)

        conn.commit()
        manifest = _build_manifest(verification, resolved_node_id)
        write_json_file(MANIFEST_PATH, manifest)
        return manifest
    finally:
        conn.close()


def main() -> int:
    load_env()
    manifest = seed_db()
    print("[seed_phase1_e2e] Seeded deterministic fixture data")
    print(f"[seed_phase1_e2e] storage_key={manifest['storage_key']}")
    print(f"[seed_phase1_e2e] question_id={manifest['question_id']}")
    print(f"[seed_phase1_e2e] rubric_source_version={manifest['rubric_source_version']}")
    print(f"[seed_phase1_e2e] manifest={MANIFEST_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
