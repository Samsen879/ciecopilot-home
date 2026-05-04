from __future__ import annotations

import json
from pathlib import Path

from scripts.vlm.review_9709_page_chain_shard_bundle_v1 import (  # noqa: E402
    build_post_extraction_review,
)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _manifest_item(storage_key: str, *, diagram_present: bool = False, review_crop_path: str = "crop.png") -> dict:
    return {
        "storage_key": storage_key,
        "diagram_present": diagram_present,
        "formula_dense": not diagram_present,
        "table_heavy": False,
        "review_crop_paths": [review_crop_path],
    }


def _projection_item(
    storage_key: str,
    *,
    diagram_present: bool = False,
    ocr_text: str = "Find the value of x in the equation x + 1 = 3.",
    page_indices: list[int] | None = None,
    rendered_page_path: str = "page.png",
) -> dict:
    return {
        "storage_key": storage_key,
        "source_pdf_path": "data/past-papers/9709Mathematics/paper1/sample.pdf",
        "q_number": 1,
        "ocr_text": ocr_text,
        "diagram_present": diagram_present,
        "diagram_elements": ["curve"] if diagram_present else [],
        "page_indices": page_indices or [0],
        "source_rendered_page_paths": [rendered_page_path],
        "review_crop_paths": ["crop.png"],
    }


def _bundle(storage_key: str, *, diagram_present: bool = False, review_reasons: list[str] | None = None) -> dict:
    return {
        "storage_key": storage_key,
        "evidence": {
            "ocr_text": "Find the value of x in the equation x + 1 = 3.",
            "diagram_present": diagram_present,
            "diagram_elements": ["curve"] if diagram_present else [],
            "spatial_evidence": ["curve is shown"] if diagram_present else [],
        },
        "surface_posture": {
            "diagram_present": diagram_present,
            "formula_dense": not diagram_present,
            "table_heavy": False,
        },
        "review_posture": {
            "requires_review": bool(review_reasons),
            "review_reasons": review_reasons or [],
            "ambiguity_flags": ["ocr_symbol_omission"] if review_reasons else [],
        },
        "route": {
            "route": "diagram_lane" if diagram_present else "ocr_lane",
        },
    }


def test_post_extraction_review_flags_manual_queue_without_blockers(tmp_path: Path):
    crop_path = tmp_path / "crop.png"
    render_path = tmp_path / "page.png"
    crop_path.write_bytes(b"png")
    render_path.write_bytes(b"png")
    manifest_path = tmp_path / "manifest.json"
    projection_path = tmp_path / "projection.json"
    bundle_path = tmp_path / "bundles.json"
    _write_json(manifest_path, {"items": [_manifest_item("q1", diagram_present=True, review_crop_path=str(crop_path))]})
    _write_json(
        projection_path,
        {"items": [_projection_item("q1", diagram_present=True, page_indices=[0, 1], rendered_page_path=str(render_path))]},
    )
    _write_json(bundle_path, {"bundles": [_bundle("q1", diagram_present=True)]})

    review = build_post_extraction_review(
        manifest_path=manifest_path,
        projection_path=projection_path,
        evidence_bundles_path=bundle_path,
        expected_count=1,
    )

    assert review["status"] == "needs_human_review"
    assert review["summary"]["blockers"] == 0
    assert review["summary"]["human_review_items"] == 1
    assert review["summary"]["manual_review_reason_counts"]["diagram_lane"] == 1
    assert review["summary"]["manual_review_reason_counts"]["multi_page_question"] == 1
    assert review["human_review_queue"][0]["storage_key"] == "q1"


def test_post_extraction_review_blocks_diagram_mismatch(tmp_path: Path):
    crop_path = tmp_path / "crop.png"
    render_path = tmp_path / "page.png"
    crop_path.write_bytes(b"png")
    render_path.write_bytes(b"png")
    manifest_path = tmp_path / "manifest.json"
    projection_path = tmp_path / "projection.json"
    bundle_path = tmp_path / "bundles.json"
    _write_json(manifest_path, {"items": [_manifest_item("q1", diagram_present=True, review_crop_path=str(crop_path))]})
    _write_json(
        projection_path,
        {"items": [_projection_item("q1", diagram_present=True, rendered_page_path=str(render_path))]},
    )
    _write_json(bundle_path, {"bundles": [_bundle("q1", diagram_present=False)]})

    review = build_post_extraction_review(
        manifest_path=manifest_path,
        projection_path=projection_path,
        evidence_bundles_path=bundle_path,
        expected_count=1,
    )

    assert review["status"] == "blocked"
    assert review["summary"]["blockers"] == 1
    assert review["blockers"][0]["reason_code"] == "diagram_present_mismatch"


def test_post_extraction_review_carries_warning_disposition_review_flags(tmp_path: Path):
    manifest_path = tmp_path / "manifest.json"
    projection_path = tmp_path / "projection.json"
    bundle_path = tmp_path / "bundles.json"
    storage_key = "9709/m21_qp_12/questions/q09.png"
    _write_json(manifest_path, {"items": [_manifest_item(storage_key)]})
    _write_json(
        projection_path,
        {
            "items": [
                _projection_item(
                    storage_key,
                    page_indices=[13, 14],
                    ocr_text="9 The first term of a progression is cos theta.",
                ),
            ],
        },
    )
    _write_json(
        bundle_path,
        {
            "bundles": [
                _bundle(
                    storage_key,
                    review_reasons=[
                        "nested subparts require normalized marks before write-back",
                        "OCR text dropped theta symbols in q09 statement",
                    ],
                ),
            ],
        },
    )

    review = build_post_extraction_review(
        manifest_path=manifest_path,
        projection_path=projection_path,
        evidence_bundles_path=bundle_path,
        expected_count=1,
    )

    queue_item = review["human_review_queue"][0]
    assert queue_item["storage_key"] == storage_key
    assert "warning_disposition" in queue_item["review_reasons"]
    assert "ocr_symbol_omission" in queue_item["review_reasons"]


def test_post_extraction_review_accepts_complete_human_visual_disposition(tmp_path: Path):
    crop_path = tmp_path / "crop.png"
    render_path = tmp_path / "page.png"
    crop_path.write_bytes(b"png")
    render_path.write_bytes(b"png")
    manifest_path = tmp_path / "manifest.json"
    projection_path = tmp_path / "projection.json"
    bundle_path = tmp_path / "bundles.json"
    dispositions_path = tmp_path / "human-dispositions.json"
    _write_json(manifest_path, {"items": [_manifest_item("q1", diagram_present=True, review_crop_path=str(crop_path))]})
    _write_json(
        projection_path,
        {"items": [_projection_item("q1", diagram_present=True, page_indices=[0, 1], rendered_page_path=str(render_path))]},
    )
    _write_json(bundle_path, {"bundles": [_bundle("q1", diagram_present=True)]})
    _write_json(
        dispositions_path,
        {
            "items": [
                {
                    "storage_key": "q1",
                    "disposition": "accepted",
                    "accepted_review_reasons": ["diagram_lane", "multi_page_question"],
                    "visual_checks": {
                        "question_boundary_accepted": True,
                        "diagram_presence_accepted": True,
                        "cross_page_continuity_accepted": True,
                    },
                },
            ],
        },
    )

    review = build_post_extraction_review(
        manifest_path=manifest_path,
        projection_path=projection_path,
        evidence_bundles_path=bundle_path,
        expected_count=1,
        human_dispositions_path=dispositions_path,
    )

    assert review["status"] == "pass"
    assert review["summary"]["human_review_items"] == 0
    assert review["summary"]["accepted_human_dispositions"] == 1
    assert review["accepted_human_dispositions"][0]["storage_key"] == "q1"


def test_post_extraction_review_keeps_incomplete_human_visual_disposition_in_queue(tmp_path: Path):
    crop_path = tmp_path / "crop.png"
    render_path = tmp_path / "page.png"
    crop_path.write_bytes(b"png")
    render_path.write_bytes(b"png")
    manifest_path = tmp_path / "manifest.json"
    projection_path = tmp_path / "projection.json"
    bundle_path = tmp_path / "bundles.json"
    dispositions_path = tmp_path / "human-dispositions.json"
    _write_json(manifest_path, {"items": [_manifest_item("q1", diagram_present=True, review_crop_path=str(crop_path))]})
    _write_json(
        projection_path,
        {"items": [_projection_item("q1", diagram_present=True, page_indices=[0, 1], rendered_page_path=str(render_path))]},
    )
    _write_json(bundle_path, {"bundles": [_bundle("q1", diagram_present=True)]})
    _write_json(
        dispositions_path,
        {
            "items": [
                {
                    "storage_key": "q1",
                    "disposition": "accepted",
                    "accepted_review_reasons": ["diagram_lane"],
                    "visual_checks": {
                        "question_boundary_accepted": True,
                        "diagram_presence_accepted": True,
                    },
                },
            ],
        },
    )

    review = build_post_extraction_review(
        manifest_path=manifest_path,
        projection_path=projection_path,
        evidence_bundles_path=bundle_path,
        expected_count=1,
        human_dispositions_path=dispositions_path,
    )

    assert review["status"] == "needs_human_review"
    assert review["summary"]["human_review_items"] == 1
    assert review["summary"]["accepted_human_dispositions"] == 0
    assert review["human_review_queue"][0]["disposition_status"] == "incomplete"
    assert review["human_review_queue"][0]["missing_accepted_review_reasons"] == ["multi_page_question"]
