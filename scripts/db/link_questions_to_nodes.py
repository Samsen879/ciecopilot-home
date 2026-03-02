#!/usr/bin/env python3
"""Link question descriptions to curriculum nodes (A1-T3)."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from scripts.common.env import load_project_env

from scripts.common.local_guard import enforce_local
from scripts.vlm.db_utils import connect, json_param


DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DEFAULT_SOURCE = "question_descriptions_prod_v1"
MAPPER_SOURCE_TAG = "a1_keyword_mapper_v1"
SAFE_RELATION_RE = re.compile(r"^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$")

STOPWORDS = {
    "and",
    "of",
    "the",
    "to",
    "in",
    "for",
    "with",
    "a",
    "an",
    "on",
    "by",
    "is",
    "are",
    "be",
    "from",
    "into",
    "at",
    "or",
    "as",
    "that",
    "this",
    "it",
    "its",
    "their",
    "given",
    "find",
    "show",
    "prove",
    "using",
    "use",
    "calculate",
    "value",
    "values",
    "equation",
    "equations",
    "solution",
    "solutions",
}

GENERIC_TOPIC_TOKENS = {
    "question",
    "paper",
    "mathematics",
    "pure",
    "topic",
    "algebra",
    "geometry",
    "series",
    "integration",
    "differentiation",
    "trigonometry",
    "functions",
    "function",
    "numbers",
    "numerical",
    "complex",
    "vectors",
    "coordinate",
    "logarithmic",
    "exponential",
    "differential",
}

# Topic-specific keyword boost dictionary for 9709 P1/P3.
TOPIC_KEYWORDS: dict[str, list[str]] = {
    "quadratics": [
        "quadratic",
        "discriminant",
        "completing the square",
        "simultaneous equation",
        "roots",
        "suitable substitution",
        "intersect for all real",
        "quadratic form",
        "lie above x-axis",
    ],
    "functions": [
        "function",
        "inverse",
        "domain",
        "range",
        "composite",
        "transformation",
        "transform y=f",
        "single transformation",
        "graph sketch",
    ],
    "coordinate_geometry": [
        "coordinate",
        "straight line",
        "gradient",
        "circle",
        "equation of line",
        "equation of circle",
        "perpendicular bisector",
        "intersection of",
        "line ab",
        "coordinates of b",
        "position vector",
        "unit vector",
    ],
    "circular_measure": [
        "radian",
        "arc length",
        "sector",
        "circular measure",
        "segment area",
        "arc",
        "perimeter of shaded region",
        "equilateral triangle",
        "bounded by arc",
        "circular arcs",
        "angle bac",
        "angle aob",
    ],
    "trigonometry": [
        "trigonometry",
        "trigonometric",
        "sin",
        "cos",
        "tan",
        "identity",
        "sine rule",
        "cosine rule",
        "solve trigonometric equation",
    ],
    "series": [
        "series",
        "arithmetic progression",
        "geometric progression",
        "binomial",
        "sum to infinity",
        "annual increase",
        "bonus percentage",
        "first year",
        "nth term",
        "progression",
        "expansion",
        "coefficient of x",
        "sum of first",
    ],
    "differentiation": [
        "differentiate",
        "derivative",
        "gradient",
        "stationary point",
        "rate of change",
        "dy/dx",
        "tangent",
        "normal",
        "parallel to x-axis",
        "minimum point",
        "maximum point",
    ],
    "integration": [
        "integrate",
        "integral",
        "area under",
        "definite integral",
        "indefinite integral",
        "under the curve",
        "find curve equation",
        "given dy/dx and a point",
        "volume of revolution",
        "about x-axis",
        "bounded by the curve",
    ],
    "algebra": [
        "partial fraction",
        "factor theorem",
        "remainder theorem",
        "modulus",
        "polynomial",
        "binomial expansion",
        "inequality",
        "expand",
        "ascending powers",
    ],
    "logarithmic_and_exponential_functions": [
        "logarithm",
        "log",
        "ln",
        "exponential",
        "e^",
        "natural logarithm",
        "solve ln",
        "solve the exponential equation",
        "e^(-",
    ],
    "numerical_solution_of_equations": [
        "iteration",
        "numerical",
        "root",
        "approximation",
        "fixed point",
        "iterate",
        "iterative formula",
    ],
    "vectors": [
        "vector",
        "scalar product",
        "dot product",
        "position vector",
        "line in vector form",
        "angle between vectors",
        "unit vector",
        "component form",
        "skew",
        "direction vectors",
        "plane",
    ],
    "differential_equations": [
        "differential equation",
        "separable",
        "dy/dx",
        "rate equation",
        "solve differential",
    ],
    "complex_numbers": [
        "complex",
        "argand",
        "modulus",
        "argument",
        "conjugate",
        "polar form",
        "omega",
        "roots of unity",
        "x+iy",
        "cartesian form",
        "imaginary axis",
        "real coefficients",
        "square roots of",
    ],
}

# Paper-specific hints for no-keyword fallback.
HEURISTIC_HINTS: dict[int, list[tuple[str, list[str]]]] = {
    1: [
        (
            "circular_measure",
            ["arc", "sector", "segment", "radian", "angle aob", "equilateral triangle", "perimeter of shaded region"],
        ),
        (
            "series",
            ["arithmetic progression", "geometric progression", "annual increase", "bonus percentage", "nth term", "sum"],
        ),
        (
            "differentiation",
            ["dy/dx", "tangent", "normal", "stationary", "parallel to x-axis", "minimum", "maximum"],
        ),
        (
            "integration",
            ["integrate", "integral", "area under", "under curve", "volume of revolution", "about x-axis"],
        ),
        ("functions", ["transformation", "inverse", "composite", "domain", "range", "y=f"]),
        (
            "coordinate_geometry",
            ["equation of line", "equation of circle", "perpendicular bisector", "intersection", "line ab", "coordinates"],
        ),
        ("quadratics", ["quadratic", "discriminant", "roots", "suitable substitution"]),
        ("trigonometry", ["sin", "cos", "tan", "identity", "sine rule", "cosine rule"]),
    ],
    3: [
        ("complex_numbers", ["complex", "argand", "polar form", "omega", "modulus", "argument", "conjugate"]),
        ("vectors", ["vector", "dot product", "scalar product", "unit vector", "component form"]),
        ("logarithmic_and_exponential_functions", ["log", "ln", "exponential", "natural logarithm", "e^"]),
        ("numerical_solution_of_equations", ["iteration", "iterate", "fixed point", "approximation", "iterative formula"]),
        ("differential_equations", ["differential equation", "separable", "solve differential"]),
        ("integration", ["integrate", "integral", "area under", "under curve", "about x-axis"]),
        ("differentiation", ["dy/dx", "differentiate", "tangent", "normal", "stationary", "parallel to x-axis"]),
        ("trigonometry", ["sin", "cos", "tan", "identity", "trigonometric"]),
        ("algebra", ["modulus", "inequality", "partial fraction", "binomial expansion", "ascending powers"]),
    ],
}


@dataclass
class TopicRule:
    node_id: str
    topic_path: str
    title: str
    paper: int
    keywords: list[str]
    keyword_regexes: list[tuple[str, re.Pattern[str] | None]]


def load_env() -> None:
    load_project_env()



def ensure_db_url() -> None:
    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"):
        if os.environ.get(key):
            return
    os.environ["DATABASE_URL"] = DEFAULT_LOCAL_DB_URL
    print(f"DATABASE_URL not set; fallback to local default: {DEFAULT_LOCAL_DB_URL}")


def parse_papers(value: str) -> list[int]:
    papers: list[int] = []
    for raw in value.split(","):
        raw = raw.strip()
        if not raw:
            continue
        papers.append(int(raw))
    if not papers:
        raise ValueError("--papers must contain at least one paper number")
    return sorted(set(papers))


def normalize_relation_name(name: str) -> str:
    rel = name.strip().lower()
    if not SAFE_RELATION_RE.fullmatch(rel):
        raise ValueError(f"invalid source relation: {name!r}")
    if "." not in rel:
        rel = f"public.{rel}"
    return rel


def relation_exists(cur: Any, relation: str) -> bool:
    cur.execute("SELECT to_regclass(%s) IS NOT NULL", (relation,))
    return bool(cur.fetchone()[0])


def resolve_source_relation(cur: Any, requested: str) -> str:
    normalized = normalize_relation_name(requested)
    if relation_exists(cur, normalized):
        return normalized
    # Backward-compatible fallback for fresh local reset.
    if normalize_relation_name(requested) == f"public.{DEFAULT_SOURCE}":
        fallback = "public.question_descriptions_v0"
        if relation_exists(cur, fallback):
            print(f"warning: {normalized} not found, fallback to {fallback}")
            return fallback
    raise RuntimeError(f"source relation not found: {normalized}")


def get_relation_columns(cur: Any, relation: str) -> set[str]:
    schema, table = relation.split(".", 1)
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        """,
        (schema, table),
    )
    return {row[0] for row in cur.fetchall()}


def derive_keywords(topic_path: str, title: str) -> list[str]:
    leaf = topic_path.split(".")[-1]
    tokens: set[str] = set()
    tokens.update(
        x for x in leaf.split("_") if x and x not in STOPWORDS and x not in GENERIC_TOPIC_TOKENS
    )
    words = re.findall(r"[a-z0-9]+", title.lower())
    tokens.update(
        x
        for x in words
        if x
        and x not in STOPWORDS
        and x not in GENERIC_TOPIC_TOKENS
        and len(x) > 3
    )
    for kw in TOPIC_KEYWORDS.get(leaf, []):
        tokens.add(kw.lower().strip())
    return sorted(tokens)


def build_topic_rules(
    cur: Any,
    syllabus_code: str,
    papers: list[int],
    version_tag: str,
) -> tuple[dict[int, list[TopicRule]], dict[int, tuple[str, str]]]:
    cur.execute(
        """
        SELECT node_id::text, topic_path::text, title, paper, level
        FROM public.curriculum_nodes
        WHERE syllabus_code = %s
          AND version_tag = %s
          AND (
            paper = ANY(%s)
            OR (level = 'paper' AND paper = ANY(%s))
          )
        ORDER BY nlevel(topic_path), sort_order, topic_path
        """,
        (syllabus_code, version_tag, papers, papers),
    )

    by_paper: dict[int, list[TopicRule]] = defaultdict(list)
    paper_roots: dict[int, tuple[str, str]] = {}

    for node_id, topic_path, title, paper, level in cur.fetchall():
        if paper is None:
            continue
        paper = int(paper)
        if level == "paper":
            paper_roots[paper] = (node_id, topic_path)
            continue
        if level != "topic":
            continue

        keywords = derive_keywords(topic_path, title)
        compiled: list[tuple[str, re.Pattern[str] | None]] = []
        for kw in keywords:
            if " " in kw:
                compiled.append((kw, None))
            else:
                compiled.append((kw, re.compile(rf"\b{re.escape(kw)}\b")))

        by_paper[paper].append(
            TopicRule(
                node_id=node_id,
                topic_path=topic_path,
                title=title,
                paper=paper,
                keywords=keywords,
                keyword_regexes=compiled,
            )
        )

    missing_roots = [p for p in papers if p not in paper_roots]
    if missing_roots:
        raise RuntimeError(f"missing paper root nodes in curriculum_nodes for papers: {missing_roots}")

    return by_paper, paper_roots


def fetch_questions(
    cur: Any,
    relation: str,
    columns: set[str],
    syllabus_code: str,
    papers: list[int],
    limit: int | None,
) -> list[dict[str, Any]]:
    required = {"storage_key", "syllabus_code", "paper"}
    missing = sorted(required - columns)
    if missing:
        raise RuntimeError(f"{relation} missing required columns: {', '.join(missing)}")

    select_cols = ["storage_key", "syllabus_code", "paper"]
    for c in ("q_number", "subpart", "summary", "question_type", "answer_form", "status"):
        if c in columns:
            select_cols.append(c)
    if "raw_json" in columns:
        select_cols.append("raw_json")

    filters = ["syllabus_code = %s", "paper = ANY(%s)"]
    params: list[Any] = [syllabus_code, papers]
    if "status" in columns:
        filters.append("status = 'ok'")

    sql = f"""
        SELECT {", ".join(select_cols)}
        FROM {relation}
        WHERE {" AND ".join(filters)}
        ORDER BY storage_key
    """
    if limit is not None:
        sql += " LIMIT %s"
        params.append(limit)

    cur.execute(sql, tuple(params))
    rows = cur.fetchall()

    questions: list[dict[str, Any]] = []
    for row in rows:
        rec = dict(zip(select_cols, row))
        questions.append(rec)
    return questions


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    text = value.lower()
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"[^a-z0-9^/+.\- ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def question_text_blob(question: dict[str, Any]) -> str:
    parts = [
        question.get("summary"),
        question.get("question_type"),
        question.get("answer_form"),
    ]
    raw_json = question.get("raw_json")
    if isinstance(raw_json, dict):
        for key in ("summary", "question_type", "answer_form", "topic_hint", "tags"):
            v = raw_json.get(key)
            if isinstance(v, str):
                parts.append(v)
            elif isinstance(v, list):
                parts.extend(str(x) for x in v)
    return normalize_text(" ".join(str(p) for p in parts if p))


def score_question(text_blob: str, rule: TopicRule) -> tuple[int, list[str]]:
    if not text_blob:
        return 0, []
    score = 0
    matched: list[str] = []
    for kw, regex_obj in rule.keyword_regexes:
        if regex_obj is None:
            if kw in text_blob:
                score += 2
                matched.append(kw)
        else:
            if regex_obj.search(text_blob):
                score += 1
                matched.append(kw)
    return score, matched


def heuristic_topic_match(
    paper: int,
    text_blob: str,
    rules: list[TopicRule],
) -> tuple[TopicRule, int, list[str]] | None:
    if not text_blob:
        return None

    by_leaf = {r.topic_path.split(".")[-1]: r for r in rules}
    best: tuple[TopicRule, int, list[str]] | None = None
    for leaf, hints in HEURISTIC_HINTS.get(paper, []):
        rule = by_leaf.get(leaf)
        if rule is None:
            continue
        score = 0
        matched: list[str] = []
        for kw in hints:
            if kw in text_blob:
                score += 2 if " " in kw else 1
                matched.append(kw)
        if score <= 0:
            continue
        if best is None or score > best[1]:
            best = (rule, score, matched)
    if best is None:
        return None
    # Require at least one phrase-level or two token-level hits.
    if best[1] < 2:
        return None
    return best


def map_question(
    question: dict[str, Any],
    rules_by_paper: dict[int, list[TopicRule]],
    roots: dict[int, tuple[str, str]],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    paper = int(question["paper"])
    text_blob = question_text_blob(question)
    rules = rules_by_paper.get(paper, [])

    scored: list[tuple[TopicRule, int, list[str]]] = []
    for rule in rules:
        score, matched = score_question(text_blob, rule)
        if score > 0:
            scored.append((rule, score, matched))
    scored.sort(key=lambda x: (x[1], len(x[2])), reverse=True)

    primary: dict[str, Any]
    secondaries: list[dict[str, Any]] = []

    if scored:
        best_rule, best_score, best_match = scored[0]
        confidence = min(0.92, 0.58 + 0.08 * best_score)
        primary = {
            "node_id": best_rule.node_id,
            "node_path": best_rule.topic_path,
            "link_type": "primary",
            "confidence": round(confidence, 4),
            "matched_keywords": best_match[:8],
            "strategy": "keyword",
            "score": best_score,
        }

        for rule, score, matched in scored[1:3]:
            if score >= max(1, best_score - 1):
                secondaries.append(
                    {
                        "node_id": rule.node_id,
                        "node_path": rule.topic_path,
                        "link_type": "secondary",
                        "confidence": round(max(0.35, confidence - 0.12), 4),
                        "matched_keywords": matched[:6],
                        "strategy": "keyword",
                        "score": score,
                    }
                )
    else:
        heuristic = heuristic_topic_match(paper, text_blob, rules)
        if heuristic:
            best_rule, best_score, best_match = heuristic
            confidence = min(0.78, 0.46 + 0.07 * best_score)
            primary = {
                "node_id": best_rule.node_id,
                "node_path": best_rule.topic_path,
                "link_type": "primary",
                "confidence": round(confidence, 4),
                "matched_keywords": best_match[:8],
                "strategy": "heuristic_fallback",
                "score": best_score,
            }
            return primary, secondaries

        root_id, root_path = roots[paper]
        primary = {
            "node_id": root_id,
            "node_path": root_path,
            "link_type": "primary",
            "confidence": 0.45,
            "matched_keywords": [],
            "strategy": "paper_fallback",
            "score": 0,
        }

    return primary, secondaries


def upsert_links(cur: Any, rows: list[dict[str, Any]]) -> tuple[int, int]:
    sql = """
        INSERT INTO public.question_concept_links (
            storage_key,
            node_id,
            link_type,
            confidence,
            source,
            evidence,
            created_at,
            updated_at
        ) VALUES (
            %(storage_key)s,
            %(node_id)s::uuid,
            %(link_type)s,
            %(confidence)s,
            %(source)s,
            %(evidence)s,
            now(),
            now()
        )
        ON CONFLICT (storage_key, node_id, link_type)
        DO UPDATE SET
            confidence = EXCLUDED.confidence,
            source = EXCLUDED.source,
            evidence = EXCLUDED.evidence,
            updated_at = now()
        RETURNING (xmax = 0) AS inserted
    """
    inserted = 0
    updated = 0
    for row in rows:
        payload = dict(row)
        payload["evidence"] = json_param(payload["evidence"])
        cur.execute(sql, payload)
        if cur.fetchone()[0]:
            inserted += 1
        else:
            updated += 1
    return inserted, updated


def delete_existing_scope_links(cur: Any, source: str, storage_keys: list[str]) -> int:
    if not storage_keys:
        return 0
    cur.execute(
        """
        DELETE FROM public.question_concept_links
        WHERE source = %s
          AND storage_key = ANY(%s)
        """,
        (source, storage_keys),
    )
    return int(cur.rowcount or 0)


def write_report(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Link question descriptions to curriculum nodes")
    parser.add_argument("--syllabus", default="9709")
    parser.add_argument("--papers", default="1,3", help="Comma-separated paper numbers")
    parser.add_argument("--version-tag", default="2025-2027_v1")
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="question source relation")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--upsert", action="store_true")
    parser.add_argument("--report-out", type=Path, default=Path("docs/reports/a1_question_concept_link_report.md"))
    parser.add_argument("--allow-remote", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    papers = parse_papers(args.papers)

    if not args.dry_run and not args.upsert:
        print("Error: use --dry-run for preview or --upsert to write DB links.", file=sys.stderr)
        return 2

    load_env()
    ensure_db_url()
    enforce_local(
        args.allow_remote,
        env_keys=["DATABASE_URL", "SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"],
    )

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    report_lines: list[str] = [
        "# A1 Question-Concept Link Report",
        "",
        f"- generated_at_utc: {now}",
        f"- syllabus: {args.syllabus}",
        f"- papers: {papers}",
        f"- version_tag: {args.version_tag}",
    ]

    with connect() as conn:
        with conn.cursor() as cur:
            source_relation = resolve_source_relation(cur, args.source)
            source_columns = get_relation_columns(cur, source_relation)
            rules_by_paper, roots = build_topic_rules(cur, args.syllabus, papers, args.version_tag)
            questions = fetch_questions(cur, source_relation, source_columns, args.syllabus, papers, args.limit)

            report_lines.append(f"- source_relation: `{source_relation}`")
            report_lines.append(f"- total_questions: {len(questions)}")

            if not questions:
                report_lines.extend(
                    [
                        "",
                        "## Summary",
                        "",
                        f"- mode: {'upsert' if args.upsert else 'dry-run'}",
                        "- No eligible question rows found in source relation.",
                        "- This run verifies script and schema only.",
                    ]
                )
                write_report(args.report_out, report_lines)
                print(f"source_relation={source_relation}")
                print(f"mode={'upsert' if args.upsert else 'dry-run'}")
                print("total_questions=0")
                print(f"report={args.report_out}")
                return 0

            link_rows: list[dict[str, Any]] = []
            linked_questions: set[str] = set()
            fallback_questions = 0
            secondary_links = 0
            paper_counter = Counter()
            strategy_counter = Counter()

            for q in questions:
                storage_key = q["storage_key"]
                paper = int(q["paper"])
                primary, secondaries = map_question(q, rules_by_paper, roots)

                if primary["strategy"] == "paper_fallback":
                    fallback_questions += 1
                strategy_counter[primary["strategy"]] += 1
                paper_counter[str(paper)] += 1

                evidence_base = {
                    "algorithm": MAPPER_SOURCE_TAG,
                    "paper": paper,
                    "q_number": q.get("q_number"),
                    "subpart": q.get("subpart"),
                    "score": primary["score"],
                    "matched_keywords": primary["matched_keywords"],
                    "source_relation": source_relation,
                }

                link_rows.append(
                    {
                        "storage_key": storage_key,
                        "node_id": primary["node_id"],
                        "link_type": "primary",
                        "confidence": primary["confidence"],
                        "source": MAPPER_SOURCE_TAG,
                        "evidence": {
                            **evidence_base,
                            "strategy": primary["strategy"],
                            "node_path": primary["node_path"],
                        },
                    }
                )
                linked_questions.add(storage_key)

                for s in secondaries:
                    secondary_links += 1
                    link_rows.append(
                        {
                            "storage_key": storage_key,
                            "node_id": s["node_id"],
                            "link_type": "secondary",
                            "confidence": s["confidence"],
                            "source": MAPPER_SOURCE_TAG,
                            "evidence": {
                                **evidence_base,
                                "strategy": s["strategy"],
                                "node_path": s["node_path"],
                                "score": s["score"],
                                "matched_keywords": s["matched_keywords"],
                            },
                        }
                    )

            coverage = (len(linked_questions) / len(questions)) * 100 if questions else 0.0

            inserted = 0
            updated = 0
            deleted = 0
            if args.upsert:
                scope_keys = sorted(linked_questions)
                deleted = delete_existing_scope_links(cur, MAPPER_SOURCE_TAG, scope_keys)
                inserted, updated = upsert_links(cur, link_rows)
                conn.commit()

            report_lines.extend(
                [
                    "",
                    "## Summary",
                    "",
                    f"- mode: {'upsert' if args.upsert else 'dry-run'}",
                    f"- linked_questions: {len(linked_questions)} / {len(questions)} ({coverage:.2f}%)",
                    f"- fallback_questions: {fallback_questions}",
                    f"- primary_links: {len(questions)}",
                    f"- secondary_links: {secondary_links}",
                    f"- total_link_rows: {len(link_rows)}",
                    f"- paper_distribution: {json.dumps(dict(paper_counter), ensure_ascii=True)}",
                    f"- strategy_distribution: {json.dumps(dict(strategy_counter), ensure_ascii=True)}",
                ]
            )
            if args.upsert:
                report_lines.extend(
                    [
                        f"- deleted_rows: {deleted}",
                        f"- inserted_rows: {inserted}",
                        f"- updated_rows: {updated}",
                    ]
                )

            write_report(args.report_out, report_lines)

            print(f"source_relation={source_relation}")
            print(f"mode={'upsert' if args.upsert else 'dry-run'}")
            print(f"total_questions={len(questions)}")
            print(f"linked_questions={len(linked_questions)}")
            print(f"coverage_pct={coverage:.2f}")
            print(f"fallback_questions={fallback_questions}")
            print(f"total_link_rows={len(link_rows)}")
            if args.upsert:
                print(f"deleted_rows={deleted}")
                print(f"inserted_rows={inserted}")
                print(f"updated_rows={updated}")
            print(f"report={args.report_out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
