from __future__ import annotations

import json
from pathlib import Path
import sys

import fitz

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.build_9709_new_paper_corrected_manifests_v2 import (  # noqa: E402
    build_corrected_manifest_set,
    discover_v1_input_manifests,
)


def _write_json(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _write_sample_pdf(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    document = fitz.open()
    document.new_page(width=360, height=480).insert_text(
        (36, 72),
        "This document has 3 pages.",
        fontsize=12,
    )
    page = document.new_page(width=360, height=480)
    page.insert_text((36, 72), "1 Find the value of x. [2]", fontsize=12)
    page.insert_text((36, 216), "2 Show that y = 4. [3]", fontsize=12)
    page.insert_text((180, 300), "3 is a body token, not a printed question header.", fontsize=12)
    page.insert_text((36, 20), "4", fontsize=12)
    document.new_page(width=360, height=480).insert_text(
        (36, 72),
        "Additional material continues here.",
        fontsize=12,
    )
    document.save(path)
    document.close()
    return path


def _manifest_for(pdf_path: Path) -> dict:
    rows = []
    for q_number in range(1, 5):
        rows.append(
            {
                "storage_key": f"9709/m25_qp_12/questions/q{q_number:02d}.png",
                "syllabus_code": "9709",
                "year": 2025,
                "session": "m",
                "paper": 1,
                "variant": 2,
                "q_number": q_number,
                "source_pdf": str(pdf_path),
                "source_pdf_watermarked": False,
                "paper_family": "p1_p3",
                "group_key": "p1_m25_standard",
                "risk_tier": "core",
                "risk_tags": ["paper_1_or_3_core_classifier_covered"],
                "shard_id": "p1_m25_standard_001",
                "source": "9709_new_papers_2026_06_02_inventory_v1",
                "surface_evidence_status": "not_yet_extracted",
                "requires_review": True,
                "route_hint": "pdf_page_chain",
                "diagram_present": None,
                "formula_dense": None,
                "table_heavy": None,
            }
        )
    return {
        "schema_version": "9709_new_papers_2026_06_02_shard_input_v1",
        "manifest_id": "9709_new_papers_2026_06_02_manifest_v1_p1_m25_standard_001",
        "subject_code": "9709",
        "generated_on": "2026-06-02",
        "source_manifest_id": "9709_new_papers_2026_06_02_manifest_v1",
        "shard_id": "p1_m25_standard_001",
        "group_key": "p1_m25_standard",
        "risk_tier": "core",
        "item_count": len(rows),
        "pdf_count": 1,
        "pdf_paths": [str(pdf_path)],
        "paper_set": [1],
        "session_year_set": ["m25"],
        "risk_tags": ["paper_1_or_3_core_classifier_covered"],
        "items": rows,
    }


def test_discover_v1_input_manifests_returns_24_new_session_year_paths(tmp_path: Path):
    manifest_dir = tmp_path / "data" / "manifests"
    expected = []
    for paper in range(1, 7):
        for session_year in ("m25", "s25", "w24", "w25"):
            path = manifest_dir / f"9709_p{paper}_{session_year}_standard_001_input_v1.json"
            _write_json(path, {"items": []})
            expected.append(path)
    _write_json(manifest_dir / "9709_p1_m_standard_001_input_v1.json", {"items": []})

    assert discover_v1_input_manifests(manifest_dir) == expected


def test_build_corrected_manifest_set_excludes_rows_without_strict_printed_question_header(tmp_path: Path):
    pdf_path = _write_sample_pdf(
        tmp_path / "data" / "past-papers" / "9709Mathematics" / "paper1" / "9709_m25_qp_12.pdf"
    )
    manifest_paths = []
    for paper in range(1, 7):
        for session_year in ("m25", "s25", "w24", "w25"):
            shard_id = f"p{paper}_{session_year}_standard_001"
            path = tmp_path / "data" / "manifests" / f"9709_{shard_id}_input_v1.json"
            payload = _manifest_for(pdf_path)
            payload["shard_id"] = shard_id
            payload["group_key"] = f"p{paper}_{session_year}_standard"
            payload["items"] = [
                {**row, "shard_id": shard_id, "group_key": payload["group_key"]}
                for row in payload["items"]
            ]
            if shard_id != "p1_m25_standard_001":
                payload["items"] = []
            payload["item_count"] = len(payload["items"])
            _write_json(path, payload)
            manifest_paths.append(path)

    result = build_corrected_manifest_set(
        manifest_paths=manifest_paths,
        workspace_root=tmp_path,
        generated_on="2026-06-03",
    )

    p1_manifest = result["shard_manifests"][0]
    assert p1_manifest["schema_version"] == "9709_new_papers_2026_06_03_shard_input_v2"
    assert p1_manifest["item_count"] == 2
    assert [item["q_number"] for item in p1_manifest["items"]] == [1, 2]
    assert result["combined_manifest"]["scope"]["question_rows_parseable"] == 2
    assert result["report"]["summary"]["input_rows_v1"] == 4
    assert result["report"]["summary"]["corrected_rows_v2"] == 2
    assert result["report"]["summary"]["excluded_false_positive_rows"] == 2
    assert {
        row["storage_key"] for row in result["report"]["excluded_false_positive_rows"]
    } == {
        "9709/m25_qp_12/questions/q03.png",
        "9709/m25_qp_12/questions/q04.png",
    }
