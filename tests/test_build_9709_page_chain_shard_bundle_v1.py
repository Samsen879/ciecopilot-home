from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.vlm.build_9709_page_chain_shard_bundle_v1 import (  # noqa: E402
    ShardBundleError,
    build_shard_bundle,
)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _manifest(items: list[dict]) -> dict:
    return {
        "schema_version": "9709_full_scaleout_manifest_v1",
        "manifest_id": "9709_full_scaleout_manifest_v1_p1_m_standard_001",
        "items": items,
    }


def _item(storage_key: str, *, q_number: int, source_pdf: str = "data/past-papers/9709Mathematics/paper1/9709_m21_qp_12.pdf") -> dict:
    return {
        "storage_key": storage_key,
        "syllabus_code": "9709",
        "year": 2021,
        "session": "m",
        "paper": 1,
        "variant": 2,
        "q_number": q_number,
        "source_pdf": source_pdf,
        "source_pdf_watermarked": False,
        "shard_id": "p1_m_standard_001",
        "risk_tier": "core",
        "risk_tags": ["paper_1_or_3_core_classifier_covered"],
        "route_hint": "pdf_page_chain",
        "diagram_present": None,
        "formula_dense": None,
        "table_heavy": None,
        "surface_evidence_status": "not_yet_extracted",
        "requires_review": True,
    }


def _payload(pdf_path: str, questions: list[dict]) -> dict:
    return {
        "schema_version": "pdf_page_chain_extraction_v1",
        "pdf_path": pdf_path,
        "model": "qwen3-vl-plus",
        "page_results": [],
        "questions": questions,
    }


def test_build_shard_bundle_projects_manifest_rows_and_lane_results(tmp_path: Path):
    pdf_path = "data/past-papers/9709Mathematics/paper1/9709_m21_qp_12.pdf"
    manifest_path = tmp_path / "shard-manifest.json"
    payload_dir = tmp_path / "outputs"
    output_root = tmp_path / "bundle"
    _write_json(
        manifest_path,
        _manifest([
            _item("9709/m21_qp_12/questions/q05.png", q_number=5, source_pdf=pdf_path),
            _item("9709/m21_qp_12/questions/q06.png", q_number=6, source_pdf=pdf_path),
        ]),
    )
    _write_json(
        payload_dir / "9709_m21_qp_12_page_chain.json",
        _payload(
            pdf_path,
            [
                {
                    "q_number": 5,
                    "ocr_text": "5 Sketch the graph of y = f(x).",
                    "has_diagram": True,
                    "diagram_elements": ["coordinate axes", "curve"],
                    "page_indices": [5],
                    "marks": [6],
                    "subpart_labels": [],
                    "evidence": ["Question number 5 starts on the page."],
                },
                {
                    "q_number": 6,
                    "ocr_text": "6 Solve the equation x^2 - 3x + 2 = 0.",
                    "has_diagram": False,
                    "diagram_elements": [],
                    "page_indices": [6],
                    "marks": [4],
                    "subpart_labels": [],
                    "evidence": ["Question number 6 starts on the page."],
                },
            ],
        ),
    )

    result = build_shard_bundle(
        manifest_path=manifest_path,
        payload_dir=payload_dir,
        render_root=tmp_path / "renders",
        review_crop_root=tmp_path / "review-crops",
        output_root=output_root,
        expected_count=2,
        generated_on="2026-05-04",
    )

    assert result["summary"]["projected_items"] == 2
    assert result["summary"]["diagram_present"] == {"true": 1, "false": 1}
    assert result["paths"]["resolution_audit"].endswith("resolution-audit.json")

    projection = json.loads(Path(result["paths"]["projection"]).read_text(encoding="utf-8"))
    assert projection["item_count"] == 2
    assert projection["items"][0]["diagram_present"] is True
    assert projection["items"][0]["route"] == "diagram_lane"
    assert projection["items"][1]["route"] == "ocr_lane"

    triaged_manifest = json.loads(Path(result["paths"]["triaged_manifest"]).read_text(encoding="utf-8"))
    assert triaged_manifest["items"][0]["diagram_present"] is True
    assert triaged_manifest["items"][0]["formula_dense"] is False
    assert triaged_manifest["items"][1]["formula_dense"] is True

    lane_results = json.loads(Path(result["paths"]["lane_results"]).read_text(encoding="utf-8"))
    assert [row["route"] for row in lane_results["results"]] == ["diagram_lane", "ocr_lane"]
    assert lane_results["results"][0]["input_asset_id"] == "9709/m21_qp_12/questions/q05.png"


def test_warning_disposition_normalizes_structure_and_marks_reviewed(tmp_path: Path):
    pdf_path = "data/past-papers/9709Mathematics/paper1/9709_m21_qp_12.pdf"
    manifest_path = tmp_path / "shard-manifest.json"
    payload_dir = tmp_path / "outputs"
    output_root = tmp_path / "bundle"
    disposition_path = tmp_path / "warning-disposition.json"
    storage_key = "9709/m21_qp_12/questions/q09.png"
    _write_json(manifest_path, _manifest([_item(storage_key, q_number=9, source_pdf=pdf_path)]))
    _write_json(
        payload_dir / "9709_m21_qp_12_page_chain.json",
        _payload(
            pdf_path,
            [
                {
                    "q_number": 9,
                    "ocr_text": "9 The first term of a progression is cos theta. (a) (i) Show... (ii) Find... (b) Find...",
                    "has_diagram": False,
                    "diagram_elements": [],
                    "page_indices": [13, 14],
                    "marks": [3, 2, 3, 2, 4],
                    "subpart_labels": ["(a)", "(i)", "(ii)", "(b)"],
                    "evidence": ["Continues onto the next page."],
                },
            ],
        ),
    )
    _write_json(
        disposition_path,
        {
            "schema_version": "9709_page_chain_warning_disposition_v1",
            "items": [
                {
                    "storage_key": storage_key,
                    "source_pdf_path": pdf_path,
                    "q_number": 9,
                    "warning": "subpart_mark_count_mismatch",
                    "disposition": "accepted_with_normalized_structure",
                    "normalized_subpart_labels": ["(a)(i)", "(a)(ii)", "(b)"],
                    "normalized_marks": [3, 2, 4],
                    "review_reasons": ["nested subparts require normalized marks before write-back"],
                    "review_summary": "q09 spans rendered pages 014-015; raw page-chain over-counted nested marks.",
                },
            ],
        },
    )

    result = build_shard_bundle(
        manifest_path=manifest_path,
        payload_dir=payload_dir,
        render_root=tmp_path / "renders",
        review_crop_root=tmp_path / "review-crops",
        output_root=output_root,
        warning_disposition_path=disposition_path,
        expected_count=1,
        generated_on="2026-05-04",
    )

    assert result["summary"]["warning_dispositions_applied"] == 1
    projection = json.loads(Path(result["paths"]["projection"]).read_text(encoding="utf-8"))
    row = projection["items"][0]
    assert row["marks"] == [3, 2, 4]
    assert row["subpart_labels"] == ["(a)(i)", "(a)(ii)", "(b)"]
    assert row["raw_page_chain"]["marks"] == [3, 2, 3, 2, 4]

    lane_results = json.loads(Path(result["paths"]["lane_results"]).read_text(encoding="utf-8"))
    evidence = {entry["field"]: entry["value"] for entry in lane_results["results"][0]["output"]["evidence"]}
    assert evidence["requires_review"] is True
    assert "nested subparts require normalized marks before write-back" in evidence["review_reasons"]
    assert "raw page-chain over-counted nested marks" in evidence["review_summary"]


def test_build_shard_bundle_fails_closed_when_question_missing(tmp_path: Path):
    manifest_path = tmp_path / "shard-manifest.json"
    payload_dir = tmp_path / "outputs"
    pdf_path = "data/past-papers/9709Mathematics/paper1/9709_m21_qp_12.pdf"
    _write_json(manifest_path, _manifest([_item("9709/m21_qp_12/questions/q09.png", q_number=9, source_pdf=pdf_path)]))
    _write_json(payload_dir / "9709_m21_qp_12_page_chain.json", _payload(pdf_path, []))

    with pytest.raises(ShardBundleError, match="no matching extracted question"):
        build_shard_bundle(
            manifest_path=manifest_path,
            payload_dir=payload_dir,
            render_root=tmp_path / "renders",
            review_crop_root=tmp_path / "review-crops",
            output_root=tmp_path / "bundle",
            expected_count=1,
        )
