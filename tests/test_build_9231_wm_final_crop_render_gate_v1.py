from __future__ import annotations

import json
from pathlib import Path
import sys

import fitz
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.build_9231_wm_final_crop_render_gate_v1 import (  # noqa: E402
    DEFAULT_S20_REVALIDATION_SHARD_IDS,
    DEFAULT_W19_GENERATION_SHARD_IDS,
    build_9231_wm_final_crop_render_gate,
    write_9231_wm_final_crop_render_gate_outputs,
)


def _write_json(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _write_sample_pdf(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    document = fitz.open()
    document.new_page(width=360, height=480).insert_text((36, 72), "Cover page", fontsize=12)
    document.new_page(width=360, height=480).insert_text(
        (36, 72),
        "1 Find the value of x. [2]",
        fontsize=12,
    )
    document.save(path)
    document.close()
    return path


def _input_manifest_for(pdf_path: Path, shard_id: str, storage_key: str) -> dict:
    row = {
        "storage_key": storage_key,
        "subject_code": "9231",
        "syllabus_code": "9231",
        "year": 2020 if "_s20_" in shard_id else 2019,
        "session": "s" if "_s20_" in shard_id else "w",
        "session_year": "s20" if "_s20_" in shard_id else "w19",
        "paper": 1,
        "variant": 1,
        "q_number": 1,
        "source_pdf": str(pdf_path),
        "shard_id": shard_id,
        "requires_review": True,
        "route_hint": "pdf_page_chain_locator",
        "source_freeze_status": "frozen_pending_source_remediation",
        "source_cleanliness_status": "watermarked_source_frozen",
        "eligible_for_clean_source_wave": False,
        "eligible_for_visual_review_closeout": False,
        "production_ready_claimed": False,
        "db_consumption_claimed": False,
        "search_consumption_claimed": False,
        "rag_consumption_claimed": False,
        "external_vlm_or_api_used": False,
        "external_ocr_rerun_used": False,
    }
    return {
        "schema_version": "9231_question_shard_split_input_v1",
        "manifest_id": f"{shard_id}_input_v1",
        "shard_id": shard_id,
        "item_count": 1,
        "items": [row],
    }


def _surface_manifest_for(input_manifest: dict, shard_id: str, *, existing_crop: bool) -> dict:
    item = dict(input_manifest["items"][0])
    item.update(
        {
            "rendered_pdf_page_paths": ["stale/render.png"] if existing_crop else [],
            "crop_paths": ["stale/crop.png"] if existing_crop else [],
            "review_crop_paths": ["stale/crop.png"] if existing_crop else [],
            "crop_status": "complete" if existing_crop else "not_generated",
            "surface_evidence_status": (
                "local_wave2_crop_render_complete_pending_visual_review"
                if existing_crop
                else "locator_resolved_pending_crop_render_and_visual_review"
            ),
            "page_chain_surface_status": (
                "wave2_crop_render_complete_pending_visual_review"
                if existing_crop
                else "locator_rows_ready_pending_crop_render_visual_review"
            ),
            "text_evidence_status": "not_extracted",
            "normalized_plain_text": None,
            "text_consumption_status": "not_ready_missing_question_plain_text",
            "text_only_ready": False,
            "image_context_required": True,
            "visual_review_required": True,
        }
    )
    return {
        "schema_version": "9231_question_shard_split_page_chain_surface_v1",
        "manifest_id": f"{shard_id}_page_chain_surface_v1",
        "shard_id": shard_id,
        "item_count": 1,
        "surface_status": (
            "wave2_crop_render_complete_pending_visual_review"
            if existing_crop
            else "locator_rows_ready_pending_crop_render_visual_review"
        ),
        "items": [item],
        "source_freeze_gate": {
            "schema_version": "9231_wm_source_freeze_gate_v1",
            "generated_on": "2026-06-05",
            "freeze_status": "frozen_pending_source_remediation",
        },
    }


def _write_gate_inputs(tmp_path: Path, *, s20_shard_id: str, w19_shard_id: str) -> dict[str, Path]:
    s20_pdf = _write_sample_pdf(
        tmp_path
        / "data"
        / "past-papers"
        / "9231Further-Mathematics"
        / "paper1"
        / "WM_9231_s20_qp_11.pdf"
    )
    w19_pdf = _write_sample_pdf(
        tmp_path
        / "data"
        / "past-papers"
        / "9231Further-Mathematics"
        / "paper1"
        / "WM_9231_w19_qp_11.pdf"
    )
    s20_input = _input_manifest_for(
        s20_pdf,
        s20_shard_id,
        "9231/s20_qp_11/questions/q01.png",
    )
    w19_input = _input_manifest_for(
        w19_pdf,
        w19_shard_id,
        "9231/w19_qp_11/questions/q01.png",
    )
    manifest_root = tmp_path / "data" / "manifests"
    _write_json(manifest_root / f"{s20_shard_id}_input_v1.json", s20_input)
    _write_json(manifest_root / f"{w19_shard_id}_input_v1.json", w19_input)
    _write_json(
        manifest_root / f"{s20_shard_id}_page_chain_surface_v1.json",
        _surface_manifest_for(s20_input, s20_shard_id, existing_crop=True),
    )
    _write_json(
        manifest_root / f"{w19_shard_id}_page_chain_surface_v1.json",
        _surface_manifest_for(w19_input, w19_shard_id, existing_crop=False),
    )
    freeze_manifest = _write_json(
        manifest_root / "9231_wm_source_freeze_2026_06_05_manifest_v1.json",
        {
            "schema_version": "9231_wm_source_freeze_manifest_v1",
            "manifest_id": "9231_wm_source_freeze_2026_06_05_manifest_v1",
            "generated_on": "2026-06-05",
            "summary": {
                "frozen_row_count": 2,
                "frozen_source_pdf_count": 2,
                "affected_shard_count": 2,
                "frozen_crop_status_counts": {"complete": 1, "not_generated": 1},
            },
            "items": [
                {
                    "source_manifest": f"data/manifests/{s20_shard_id}_page_chain_surface_v1.json",
                    "source_manifest_index": 0,
                    "shard_id": s20_shard_id,
                    "storage_key": "9231/s20_qp_11/questions/q01.png",
                    "source_pdf": str(s20_pdf),
                    "q_number": 1,
                    "crop_status": "complete",
                },
                {
                    "source_manifest": f"data/manifests/{w19_shard_id}_page_chain_surface_v1.json",
                    "source_manifest_index": 0,
                    "shard_id": w19_shard_id,
                    "storage_key": "9231/w19_qp_11/questions/q01.png",
                    "source_pdf": str(w19_pdf),
                    "q_number": 1,
                    "crop_status": "not_generated",
                },
            ],
        },
    )
    remediation_report = _write_json(
        tmp_path / "docs" / "reports" / "2026-06-06-9231-wm-source-remediation-gate.json",
        {
            "schema_version": "9231_wm_source_remediation_gate_v1",
            "generated_on": "2026-06-06",
            "gate_status": "pass",
            "summary": {
                "target_source_pdf_count": 2,
                "verified_or_replaced_count": 2,
                "red_pixel_gate_pass_count": 2,
                "total_after_red_pixels": 0,
                "affected_frozen_rows": 2,
                "affected_shard_count": 2,
                "freeze_posture_lifted_by_machine_gate": True,
                "production_ready_claimed": False,
                "db_search_rag_consumption_claimed": False,
            },
            "records": [],
        },
    )
    return {
        "manifest_root": manifest_root,
        "freeze_manifest": freeze_manifest,
        "remediation_report": remediation_report,
    }


def test_default_final_wm_shards_match_issue_scope():
    assert DEFAULT_S20_REVALIDATION_SHARD_IDS == (
        "9231_p1_s20_standard_001",
        "9231_p2_s20_standard_001",
        "9231_p3_s20_standard_001",
        "9231_p4_s20_standard_001",
    )
    assert DEFAULT_W19_GENERATION_SHARD_IDS == (
        "9231_p1_w19_standard_001",
        "9231_p2_w19_standard_001",
    )


def test_build_9231_wm_final_crop_render_gate_revalidates_s20_and_generates_w19(tmp_path: Path):
    s20_shard_id = "9231_p1_s20_standard_001"
    w19_shard_id = "9231_p1_w19_standard_001"
    paths = _write_gate_inputs(tmp_path, s20_shard_id=s20_shard_id, w19_shard_id=w19_shard_id)

    result = build_9231_wm_final_crop_render_gate(
        s20_shard_ids=[s20_shard_id],
        w19_shard_ids=[w19_shard_id],
        manifest_root=paths["manifest_root"],
        s20_output_root=tmp_path / "data" / "crops" / "9231-wave2-shards",
        w19_output_root=tmp_path / "data" / "crops" / "9231-wm-final",
        workspace_root=tmp_path,
        freeze_manifest_path=paths["freeze_manifest"],
        source_remediation_report_path=paths["remediation_report"],
        generated_on="2026-06-06",
        expected_total_rows=2,
        expected_s20_rows=1,
        expected_w19_rows=1,
        render_scale=1.0,
    )

    report = result["report"]
    summary = report["summary"]
    assert report["schema_version"] == "9231_wm_final_crop_render_gate_v1"
    assert report["gate_status"] == "wm_final_crop_render_complete_pending_visual_review"
    assert summary["total_rows"] == 2
    assert summary["crop_rows_complete"] == 2
    assert summary["missing_crops"] == 0
    assert summary["s20_revalidated_rows"] == 1
    assert summary["w19_generated_rows"] == 1
    assert summary["row_identity_preserved"] is True
    assert report["source_remediation_gate"]["gate_status"] == "pass"
    assert report["boundary"]["external_vlm_or_api_calls"] == 0
    assert report["boundary"]["not_question_plain_text_v1_or_v2"] is True
    assert report["boundary"]["db_consumption_claimed"] is False
    assert report["boundary"]["search_consumption_claimed"] is False
    assert report["boundary"]["rag_consumption_claimed"] is False

    crop_manifest = result["crop_manifest"]
    assert crop_manifest["schema_version"] == "9231_wm_final_crop_manifest_v1"
    assert crop_manifest["manifest_id"] == "9231_wm_final_crop_manifest_2026_06_06_v1"
    assert crop_manifest["item_count"] == 2
    by_storage_key = {item["storage_key"]: item for item in crop_manifest["items"]}
    assert by_storage_key["9231/s20_qp_11/questions/q01.png"]["wm_final_crop_phase"] == (
        "s20_revalidated_after_source_remediation"
    )
    assert by_storage_key["9231/w19_qp_11/questions/q01.png"]["wm_final_crop_phase"] == (
        "w19_generated_after_source_remediation"
    )
    assert by_storage_key["9231/s20_qp_11/questions/q01.png"]["crop_paths"][0].startswith(
        "data/crops/9231-wave2-shards/"
    )
    assert by_storage_key["9231/w19_qp_11/questions/q01.png"]["crop_paths"][0].startswith(
        "data/crops/9231-wm-final/"
    )

    updated_surfaces = {record["shard_id"]: record["payload"] for record in result["updated_surface_manifests"]}
    for shard_id in [s20_shard_id, w19_shard_id]:
        surface = updated_surfaces[shard_id]
        row = surface["items"][0]
        assert surface["surface_status"] == "wm_final_crop_render_complete_pending_visual_review"
        assert "wm_final_crop_gate" in surface
        assert "pilot_crop_gate" not in surface
        assert row["q_number"] == 1
        assert row["crop_status"] == "complete"
        assert row["source_freeze_status"] == "source_remediated_crop_render_complete"
        assert row["source_remediation_status"] == "source_bytes_clean_red_pixel_gate_pass"
        assert row["surface_evidence_status"] == "local_wm_final_crop_render_complete_pending_visual_review"
        assert row["page_chain_surface_status"] == "wm_final_crop_render_complete_pending_visual_review"
        assert row["production_ready_claimed"] is False
        assert row["external_vlm_or_api_used"] is False
        assert (tmp_path / row["crop_paths"][0]).exists()
        assert (tmp_path / row["rendered_pdf_page_paths"][0]).exists()


def test_write_9231_wm_final_crop_render_gate_outputs_persists_reports_and_surfaces(tmp_path: Path):
    s20_shard_id = "9231_p1_s20_standard_001"
    w19_shard_id = "9231_p1_w19_standard_001"
    paths = _write_gate_inputs(tmp_path, s20_shard_id=s20_shard_id, w19_shard_id=w19_shard_id)
    result = build_9231_wm_final_crop_render_gate(
        s20_shard_ids=[s20_shard_id],
        w19_shard_ids=[w19_shard_id],
        manifest_root=paths["manifest_root"],
        s20_output_root=tmp_path / "data" / "crops" / "9231-wave2-shards",
        w19_output_root=tmp_path / "data" / "crops" / "9231-wm-final",
        workspace_root=tmp_path,
        freeze_manifest_path=paths["freeze_manifest"],
        source_remediation_report_path=paths["remediation_report"],
        generated_on="2026-06-06",
        expected_total_rows=2,
        expected_s20_rows=1,
        expected_w19_rows=1,
        render_scale=1.0,
    )

    output_paths = write_9231_wm_final_crop_render_gate_outputs(
        result,
        crop_manifest_path=tmp_path
        / "data"
        / "manifests"
        / "9231_wm_final_crop_manifest_2026_06_06_v1.json",
        report_json_path=tmp_path / "docs" / "reports" / "2026-06-06-9231-wm-final-crop-render-gate.json",
        report_md_path=tmp_path / "docs" / "reports" / "2026-06-06-9231-wm-final-crop-render-gate.md",
    )

    assert output_paths["crop_manifest_path"].exists()
    assert output_paths["report_json_path"].exists()
    assert output_paths["report_md_path"].exists()
    persisted_surface = json.loads(
        (paths["manifest_root"] / f"{w19_shard_id}_page_chain_surface_v1.json").read_text(encoding="utf-8")
    )
    assert persisted_surface["items"][0]["q_number"] == 1
    assert persisted_surface["items"][0]["page_chain_surface_status"] == (
        "wm_final_crop_render_complete_pending_visual_review"
    )


def test_build_9231_wm_final_crop_render_gate_stops_on_row_count_mismatch(tmp_path: Path):
    s20_shard_id = "9231_p1_s20_standard_001"
    w19_shard_id = "9231_p1_w19_standard_001"
    paths = _write_gate_inputs(tmp_path, s20_shard_id=s20_shard_id, w19_shard_id=w19_shard_id)

    with pytest.raises(RuntimeError, match="expected_total_rows"):
        build_9231_wm_final_crop_render_gate(
            s20_shard_ids=[s20_shard_id],
            w19_shard_ids=[w19_shard_id],
            manifest_root=paths["manifest_root"],
            s20_output_root=tmp_path / "data" / "crops" / "9231-wave2-shards",
            w19_output_root=tmp_path / "data" / "crops" / "9231-wm-final",
            workspace_root=tmp_path,
            freeze_manifest_path=paths["freeze_manifest"],
            source_remediation_report_path=paths["remediation_report"],
            generated_on="2026-06-06",
            expected_total_rows=3,
            expected_s20_rows=1,
            expected_w19_rows=1,
            render_scale=1.0,
        )
