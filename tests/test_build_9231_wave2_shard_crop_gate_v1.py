from __future__ import annotations

import json
from pathlib import Path
import sys

import fitz

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.build_9231_wave2_shard_crop_gate_v1 import (  # noqa: E402
    DEFAULT_WAVE2_SHARD_IDS,
    build_9231_wave2_shard_crop_gate,
    write_9231_wave2_shard_crop_gate_outputs,
)


PILOT_SHARD_IDS = {
    "9231_p1_s25_standard_001",
    "9231_p2_s25_standard_001",
    "9231_p3_s25_standard_001",
    "9231_p4_s25_standard_001",
    "9231_p1_s16_standard_001",
}


def _write_json(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _write_sample_pdf(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    document = fitz.open()
    document.new_page(width=360, height=480).insert_text((36, 72), "Cover page", fontsize=12)
    page = document.new_page(width=360, height=480)
    page.insert_text((36, 72), "1 Find the value of x. [2]", fontsize=12)
    page.insert_text((36, 216), "2 Show that y = 4. [3]", fontsize=12)
    document.new_page(width=360, height=480).insert_text((36, 72), "3 Solve the equation. [4]", fontsize=12)
    document.save(path)
    document.close()
    return path


def _input_manifest_for(pdf_path: Path, shard_id: str) -> dict:
    rows = [
        {
            "storage_key": "9231/w25_qp_11/questions/q01.png",
            "subject_code": "9231",
            "syllabus_code": "9231",
            "year": 2025,
            "session": "w",
            "session_year": "w25",
            "paper": 1,
            "variant": 1,
            "q_number": 1,
            "source_pdf": str(pdf_path),
            "shard_id": shard_id,
            "requires_review": True,
            "route_hint": "pdf_page_chain_locator",
        },
        {
            "storage_key": "9231/w25_qp_11/questions/q02.png",
            "subject_code": "9231",
            "syllabus_code": "9231",
            "year": 2025,
            "session": "w",
            "session_year": "w25",
            "paper": 1,
            "variant": 1,
            "q_number": 2,
            "source_pdf": str(pdf_path),
            "shard_id": shard_id,
            "requires_review": True,
            "route_hint": "pdf_page_chain_locator",
        },
    ]
    return {
        "schema_version": "9231_question_shard_split_input_v1",
        "manifest_id": f"{shard_id}_input_v1",
        "shard_id": shard_id,
        "item_count": len(rows),
        "items": rows,
    }


def _surface_manifest_for(input_manifest: dict, shard_id: str) -> dict:
    return {
        "schema_version": "9231_question_shard_split_page_chain_surface_v1",
        "manifest_id": f"{shard_id}_page_chain_surface_v1",
        "shard_id": shard_id,
        "item_count": input_manifest["item_count"],
        "surface_status": "locator_rows_ready_pending_crop_render_visual_review",
        "items": [
            {
                **item,
                "rendered_pdf_page_paths": [],
                "crop_paths": [],
                "review_crop_paths": [],
                "crop_status": "not_generated",
                "surface_evidence_status": "locator_resolved_pending_crop_render_and_visual_review",
                "production_ready_claimed": False,
                "db_consumption_claimed": False,
                "search_consumption_claimed": False,
                "rag_consumption_claimed": False,
                "external_vlm_or_api_used": False,
                "external_ocr_rerun_used": False,
            }
            for item in input_manifest["items"]
        ],
    }


def test_default_wave2_shards_are_representative_and_exclude_pilot_set():
    assert DEFAULT_WAVE2_SHARD_IDS == (
        "9231_p1_w25_standard_001",
        "9231_p2_w25_standard_001",
        "9231_p3_w25_standard_001",
        "9231_p4_w25_standard_001",
        "9231_p1_s24_standard_001",
        "9231_p2_s24_standard_001",
        "9231_p3_s24_standard_001",
        "9231_p4_s24_standard_001",
        "9231_p1_s20_standard_001",
        "9231_p2_s20_standard_001",
        "9231_p3_s20_standard_001",
        "9231_p4_s20_standard_001",
        "9231_p1_w16_standard_001",
        "9231_p2_s16_standard_001",
        "9231_p2_w16_standard_001",
        "9231_p1_s18_standard_001",
    )
    assert len(DEFAULT_WAVE2_SHARD_IDS) == 16
    assert not (set(DEFAULT_WAVE2_SHARD_IDS) & PILOT_SHARD_IDS)


def test_build_9231_wave2_shard_crop_gate_updates_surface_rows_with_wave2_labels(tmp_path: Path):
    shard_id = "9231_p1_w25_standard_001"
    pdf_path = _write_sample_pdf(
        tmp_path / "data" / "past-papers" / "9231Further-Mathematics" / "paper1" / "9231_w25_qp_11.pdf"
    )
    input_manifest = _input_manifest_for(pdf_path, shard_id)
    _write_json(tmp_path / "data" / "manifests" / f"{shard_id}_input_v1.json", input_manifest)
    _write_json(
        tmp_path / "data" / "manifests" / f"{shard_id}_page_chain_surface_v1.json",
        _surface_manifest_for(input_manifest, shard_id),
    )

    result = build_9231_wave2_shard_crop_gate(
        wave2_shard_ids=[shard_id],
        manifest_root=tmp_path / "data" / "manifests",
        output_root=tmp_path / "tmp" / "pdf-page-chain" / "9231-wave2-shards",
        workspace_root=tmp_path,
        generated_on="2026-06-05",
        render_scale=1.0,
    )

    assert result["crop_manifest"]["schema_version"] == "9231_wave2_shard_crop_manifest_v1"
    assert result["crop_manifest"]["scope"]["stage"] == "9231 wave2 shard render/crop gate"
    assert result["report"]["schema_version"] == "9231_wave2_shard_crop_gate_v1"
    assert result["report"]["gate_status"] == "wave2_crop_render_complete_pending_visual_review"
    assert result["report"]["summary"]["wave2_shards"] == 1
    assert result["report"]["summary"]["total_rows"] == 2
    assert result["report"]["summary"]["crop_rows_complete"] == 2
    assert result["report"]["summary"]["missing_crops"] == 0
    assert result["report"]["summary"]["local_png_artifact_files"] == 5
    assert result["report"]["wave2_shard_ids"] == [shard_id]
    assert "pilot_shard_ids" not in result["report"]

    updated_surface = result["updated_surface_manifests"][0]["payload"]
    first = updated_surface["items"][0]
    assert "wave2_crop_gate" in updated_surface
    assert "pilot_crop_gate" not in updated_surface
    assert updated_surface["surface_status"] == "wave2_crop_render_complete_pending_visual_review"
    assert first["crop_status"] == "complete"
    assert first["surface_evidence_status"] == "local_wave2_crop_render_complete_pending_visual_review"
    assert first["page_chain_surface_status"] == "wave2_crop_render_complete_pending_visual_review"
    assert first["production_ready_claimed"] is False
    assert first["db_consumption_claimed"] is False
    assert first["external_vlm_or_api_used"] is False
    assert (tmp_path / first["crop_paths"][0]).exists()


def test_build_9231_wave2_shard_crop_gate_records_watermarked_source_filename_risk(tmp_path: Path):
    shard_id = "9231_p4_s20_standard_001"
    pdf_path = _write_sample_pdf(
        tmp_path / "data" / "past-papers" / "9231Further-Mathematics" / "paper4" / "WM_9231_s20_qp_41.pdf"
    )
    input_manifest = _input_manifest_for(pdf_path, shard_id)
    _write_json(tmp_path / "data" / "manifests" / f"{shard_id}_input_v1.json", input_manifest)
    _write_json(
        tmp_path / "data" / "manifests" / f"{shard_id}_page_chain_surface_v1.json",
        _surface_manifest_for(input_manifest, shard_id),
    )

    result = build_9231_wave2_shard_crop_gate(
        wave2_shard_ids=[shard_id],
        manifest_root=tmp_path / "data" / "manifests",
        output_root=tmp_path / "tmp" / "pdf-page-chain" / "9231-wave2-shards",
        workspace_root=tmp_path,
        generated_on="2026-06-05",
        render_scale=1.0,
    )

    risks = result["report"]["source_cleanliness_risks"]
    assert risks["watermarked_source_pdf_count"] == 1
    assert risks["watermarked_source_row_count"] == 2
    assert risks["mechanical_crop_blocker"] is False
    assert risks["risk_status"] == "watermarked_source_paths_present_visual_review_required"


def test_write_9231_wave2_shard_crop_gate_outputs_persists_reports_and_surfaces(tmp_path: Path):
    shard_id = "9231_p1_w25_standard_001"
    pdf_path = _write_sample_pdf(
        tmp_path / "data" / "past-papers" / "9231Further-Mathematics" / "paper1" / "9231_w25_qp_11.pdf"
    )
    input_manifest = _input_manifest_for(pdf_path, shard_id)
    _write_json(tmp_path / "data" / "manifests" / f"{shard_id}_input_v1.json", input_manifest)
    surface_path = _write_json(
        tmp_path / "data" / "manifests" / f"{shard_id}_page_chain_surface_v1.json",
        _surface_manifest_for(input_manifest, shard_id),
    )
    result = build_9231_wave2_shard_crop_gate(
        wave2_shard_ids=[shard_id],
        manifest_root=tmp_path / "data" / "manifests",
        output_root=tmp_path / "tmp" / "pdf-page-chain" / "9231-wave2-shards",
        workspace_root=tmp_path,
        generated_on="2026-06-05",
        render_scale=1.0,
    )

    paths = write_9231_wave2_shard_crop_gate_outputs(
        result,
        crop_manifest_path=tmp_path / "data" / "manifests" / "9231_wave2_shards_2026_06_05_crop_manifest_v1.json",
        report_json_path=tmp_path / "docs" / "reports" / "2026-06-05-9231-wave2-shard-crop-gate.json",
        report_md_path=tmp_path / "docs" / "reports" / "2026-06-05-9231-wave2-shard-crop-gate.md",
    )

    assert paths["crop_manifest_path"].exists()
    assert paths["report_json_path"].exists()
    assert paths["report_md_path"].exists()
    persisted_surface = json.loads(surface_path.read_text(encoding="utf-8"))
    assert persisted_surface["items"][0]["page_chain_surface_status"] == "wave2_crop_render_complete_pending_visual_review"
