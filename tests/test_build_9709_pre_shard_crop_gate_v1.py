from __future__ import annotations

import json
from pathlib import Path
import sys

import fitz

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.build_9709_pre_shard_crop_gate_v1 import (  # noqa: E402
    build_pre_shard_crop_gate,
    discover_new_input_manifests,
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
    document.new_page(width=360, height=480).insert_text(
        (36, 72),
        "3 Solve the equation. [4]",
        fontsize=12,
    )
    document.save(path)
    document.close()
    return path


def _manifest_for(pdf_path: Path) -> dict:
    rows = [
        {
            "storage_key": "9709/m25_qp_12/questions/q01.png",
            "syllabus_code": "9709",
            "year": 2025,
            "session": "m",
            "paper": 1,
            "variant": 2,
            "q_number": 1,
            "source_pdf": str(pdf_path),
            "source_pdf_watermarked": False,
            "shard_id": "p1_m25_standard_001",
            "requires_review": True,
            "route_hint": "pdf_page_chain",
        },
        {
            "storage_key": "9709/m25_qp_12/questions/q02.png",
            "syllabus_code": "9709",
            "year": 2025,
            "session": "m",
            "paper": 1,
            "variant": 2,
            "q_number": 2,
            "source_pdf": str(pdf_path),
            "source_pdf_watermarked": False,
            "shard_id": "p1_m25_standard_001",
            "requires_review": True,
            "route_hint": "pdf_page_chain",
        },
    ]
    return {
        "schema_version": "9709_new_paper_shard_input_v1",
        "manifest_id": "9709_p1_m25_standard_001_input_v1",
        "shard_id": "p1_m25_standard_001",
        "item_count": len(rows),
        "items": rows,
    }


def test_discover_new_input_manifests_uses_only_new_session_year_inputs(tmp_path: Path):
    manifest_dir = tmp_path / "data" / "manifests"
    expected = []
    for paper in range(1, 7):
        for session_year in ("m25", "s25", "w24", "w25"):
            path = manifest_dir / f"9709_p{paper}_{session_year}_standard_001_input_v1.json"
            _write_json(path, {"items": []})
            expected.append(path)
    _write_json(manifest_dir / "9709_p1_m_standard_001_input_v1.json", {"items": []})

    assert discover_new_input_manifests(manifest_dir) == expected


def test_build_pre_shard_crop_gate_renders_all_pages_and_writes_row_crops(tmp_path: Path):
    pdf_path = _write_sample_pdf(
        tmp_path / "data" / "past-papers" / "9709Mathematics" / "paper1" / "9709_m25_qp_12.pdf"
    )
    manifest_path = _write_json(
        tmp_path / "data" / "manifests" / "9709_p1_m25_standard_001_input_v1.json",
        _manifest_for(pdf_path),
    )

    result = build_pre_shard_crop_gate(
        manifest_paths=[manifest_path],
        output_root=tmp_path / "tmp" / "pdf-page-chain" / "new-papers-pre-shard",
        workspace_root=tmp_path,
        generated_on="2026-06-02",
        render_scale=1.0,
    )

    assert result["crop_manifest"]["schema_version"] == "9709_new_papers_pre_shard_crop_manifest_v1"
    assert result["crop_manifest"]["item_count"] == 2
    assert result["report"]["summary"]["pdfs_rendered"] == 1
    assert result["report"]["summary"]["rendered_pages"] == 3
    assert result["report"]["summary"]["total_rows"] == 2
    assert result["report"]["summary"]["crop_rows_complete"] == 2
    assert result["report"]["summary"]["missing_crops"] == 0
    assert result["report"]["summary"]["visual_review_required_rows"] == 2

    first = result["crop_manifest"]["items"][0]
    assert first["storage_key"] == "9709/m25_qp_12/questions/q01.png"
    assert first["crop_status"] == "complete"
    assert first["local_extraction_crop_method"] == "pymupdf_text_words_question_band_v1"
    assert first["visual_review_required"] is True
    assert first["page_indices"] == [1]
    assert len(first["rendered_pdf_page_paths"]) == 1
    assert len(first["crop_paths"]) == 1
    assert (tmp_path / first["rendered_pdf_page_paths"][0]).exists()
    assert (tmp_path / first["crop_paths"][0]).exists()

    pdf_record = result["report"]["pdfs"][0]
    assert len(pdf_record["rendered_page_paths"]) == 3
    for rendered_path in pdf_record["rendered_page_paths"]:
        assert (tmp_path / rendered_path).exists()


def test_build_pre_shard_crop_gate_accepts_explicit_manifest_identity(tmp_path: Path):
    pdf_path = _write_sample_pdf(
        tmp_path / "data" / "past-papers" / "9709Mathematics" / "paper1" / "9709_m25_qp_12.pdf"
    )
    manifest_path = _write_json(
        tmp_path / "data" / "manifests" / "9709_p1_m25_standard_001_input_v2.json",
        _manifest_for(pdf_path),
    )

    result = build_pre_shard_crop_gate(
        manifest_paths=[manifest_path],
        output_root=tmp_path / "tmp" / "pdf-page-chain" / "new-papers-pre-shard-v2",
        workspace_root=tmp_path,
        generated_on="2026-06-03",
        render_scale=1.0,
        crop_manifest_id="9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2",
        crop_manifest_schema_version="9709_new_papers_pre_shard_crop_manifest_v2",
        source_scope_label="24 corrected v2 new-paper input shard manifests",
    )

    crop_manifest = result["crop_manifest"]
    assert crop_manifest["schema_version"] == "9709_new_papers_pre_shard_crop_manifest_v2"
    assert crop_manifest["manifest_id"] == "9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2"
    assert crop_manifest["scope"]["source"] == "24 corrected v2 new-paper input shard manifests"
