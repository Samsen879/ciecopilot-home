from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.build_9709_scaleout_inventory_v1 import (  # noqa: E402
    build_db_coverage_sql,
    build_scaleout_inventory,
    build_scaleout_manifest,
    classify_pdf_risk,
)


def _paper_manifest(pdf_path: Path, items: list[dict], summary: dict) -> dict:
    return {
        "manifest_id": f"{pdf_path.stem}_full_pdf_page_v1",
        "source_pdf": str(pdf_path),
        "items": items,
        "locator_audit": {
            "summary": summary,
            "entries": [
                {
                    "q_number": item["q_number"],
                    "found": True,
                    "included": True,
                    "page_indices": [0],
                    "score": 42,
                    "warnings": [],
                }
                for item in items
            ],
        },
    }


def test_classify_pdf_risk_separates_watermark_and_paper_family():
    standard = classify_pdf_risk(Path("data/past-papers/9709Mathematics/paper1/9709_s24_qp_13.pdf"))
    watermarked_stats = classify_pdf_risk(Path("data/past-papers/9709Mathematics/paper6/WM_9709_s20_qp_63.pdf"))

    assert standard["group_key"] == "p1_s_standard"
    assert standard["risk_tier"] == "core"
    assert "watermarked_source_pdf" not in standard["risk_tags"]

    assert watermarked_stats["group_key"] == "p6_s_watermarked"
    assert watermarked_stats["risk_tier"] == "high"
    assert "watermarked_source_pdf" in watermarked_stats["risk_tags"]
    assert "paper_5_or_6_outside_current_release_scope" in watermarked_stats["risk_tags"]


def test_build_scaleout_inventory_summarizes_pdfs_rows_and_shards(tmp_path):
    pdf_a = tmp_path / "9709_s24_qp_13.pdf"
    pdf_b = tmp_path / "WM_9709_s20_qp_63.pdf"
    pdf_a.write_text("fake", encoding="utf-8")
    pdf_b.write_text("fake", encoding="utf-8")

    manifests = {
        pdf_a: _paper_manifest(
            pdf_a,
            [
                {"storage_key": "9709/s24_qp_13/questions/q01.png", "q_number": 1},
                {"storage_key": "9709/s24_qp_13/questions/q02.png", "q_number": 2},
            ],
            {
                "targeted_questions": 3,
                "found": 2,
                "included": 2,
                "missing": 1,
                "multi_page": 0,
                "low_score": 0,
                "excluded_low_score": 0,
            },
        ),
        pdf_b: _paper_manifest(
            pdf_b,
            [
                {"storage_key": "9709/s20_qp_63/questions/q01.png", "q_number": 1},
                {"storage_key": "9709/s20_qp_63/questions/q02.png", "q_number": 2},
            ],
            {
                "targeted_questions": 2,
                "found": 2,
                "included": 2,
                "missing": 0,
                "multi_page": 1,
                "low_score": 0,
                "excluded_low_score": 0,
            },
        ),
    }

    inventory = build_scaleout_inventory(
        [pdf_a, pdf_b],
        shard_size=2,
        generated_on="2026-05-04",
        paper_manifest_builder=lambda pdf_path, **_kwargs: manifests[Path(pdf_path)],
    )

    assert inventory["summary"]["pdfs_total"] == 2
    assert inventory["summary"]["watermarked_pdfs"] == 1
    assert inventory["summary"]["question_rows_parseable"] == 4
    assert inventory["summary"]["question_rows_missing"] == 1
    assert inventory["summary"]["question_rows_multi_page"] == 1
    assert inventory["summary"]["by_paper"] == {"1": 1, "6": 1}
    assert inventory["summary"]["parseable_rows_by_paper"] == {"1": 2, "6": 2}
    assert inventory["summary"]["shards_total"] == 2
    assert [shard["shard_id"] for shard in inventory["shards"]] == [
        "p1_s_standard_001",
        "p6_s_watermarked_001",
    ]
    assert inventory["items"][0]["shard_id"] == "p1_s_standard_001"
    assert inventory["items"][2]["risk_tier"] == "high"


def test_build_scaleout_manifest_keeps_only_runnable_question_items(tmp_path):
    pdf = tmp_path / "9709_w23_qp_31.pdf"
    pdf.write_text("fake", encoding="utf-8")
    inventory = build_scaleout_inventory(
        [pdf],
        shard_size=300,
        generated_on="2026-05-04",
        paper_manifest_builder=lambda _pdf_path, **_kwargs: _paper_manifest(
            pdf,
            [{"storage_key": "9709/w23_qp_31/questions/q01.png", "q_number": 1}],
            {
                "targeted_questions": 1,
                "found": 1,
                "included": 1,
                "missing": 0,
                "multi_page": 0,
                "low_score": 0,
                "excluded_low_score": 0,
            },
        ),
    )

    manifest = build_scaleout_manifest(inventory)

    assert manifest["manifest_id"] == "9709_full_scaleout_manifest_v1"
    assert manifest["scope"]["source_inventory_id"] == inventory["inventory_id"]
    assert manifest["items"] == [
        {
            "storage_key": "9709/w23_qp_31/questions/q01.png",
            "syllabus_code": "9709",
            "year": 2023,
            "session": "w",
            "paper": 3,
            "variant": 1,
            "q_number": 1,
            "source_pdf": str(pdf),
            "source_pdf_watermarked": False,
            "shard_id": "p3_w_standard_001",
            "risk_tier": "core",
            "risk_tags": ["paper_1_or_3_core_classifier_covered"],
            "route_hint": "pdf_page_chain",
            "diagram_present": None,
            "formula_dense": None,
            "table_heavy": None,
            "surface_evidence_status": "not_yet_extracted",
            "requires_review": True,
            "source": "9709_full_scaleout_inventory_v1",
        }
    ]


def test_build_db_coverage_sql_uses_classification_snapshot_id():
    sql = build_db_coverage_sql(Path("/tmp/items.csv"))

    assert "lqas.classification_snapshot_id AS active_snapshot_id" in sql
    assert "lqas.snapshot_id" not in sql
