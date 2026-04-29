from __future__ import annotations

import json
from pathlib import Path
import sys

from PIL import Image
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import scripts.vlm.build_pdf_page_chain_review_crops_v1 as review_crops  # noqa: E402
from scripts.vlm.build_pdf_page_chain_review_crops_v1 import (  # noqa: E402
    build_review_crops_for_payload,
    compute_question_page_bands,
)


def test_compute_question_page_bands_runs_to_next_question_start():
    page_result = {
        "page_index": 0,
        "fragments": [
            {"q_number": 1, "bbox_norm": [100, 100, 900, 200]},
            {"q_number": 1, "bbox_norm": [120, 350, 900, 420]},
            {"q_number": 2, "bbox_norm": [100, 650, 900, 720]},
        ],
    }

    bands = compute_question_page_bands(page_result, page_width=1000, page_height=2000, padding_px=20)

    assert bands[0]["q_number"] == 1
    assert bands[0]["crop_box"] == [0, 180, 1000, 1280]
    assert bands[1]["q_number"] == 2
    assert bands[1]["crop_box"] == [0, 1280, 1000, 2000]


def test_compute_question_page_bands_uses_full_width_for_narrow_bad_bbox():
    page_result = {
        "page_index": 0,
        "fragments": [
            {"q_number": 7, "bbox_norm": [0, 0, 37, 1000]},
        ],
    }

    bands = compute_question_page_bands(page_result, page_width=1000, page_height=2000, padding_px=20)

    assert bands[0]["crop_box"] == [0, 0, 1000, 2000]


def test_compute_question_page_bands_accepts_unit_scale_bbox_norm():
    page_result = {
        "page_index": 0,
        "fragments": [
            {"q_number": 1, "bbox_norm": [0.1, 0.07, 0.85, 0.13]},
            {"q_number": 2, "bbox_norm": [0.1, 0.15, 0.85, 0.2]},
        ],
    }

    bands = compute_question_page_bands(page_result, page_width=1000, page_height=2000, padding_px=20)

    assert bands[0]["crop_box"] == [0, 120, 1000, 300]
    assert bands[1]["crop_box"] == [0, 280, 1000, 2000]


def test_compute_question_page_bands_uses_pdf_question_starts_when_available():
    page_result = {
        "page_index": 0,
        "fragments": [
            {"q_number": 2, "bbox_norm": [72, 115, 890, 145]},
            {"q_number": 3, "bbox_norm": [72, 165, 890, 195]},
            {"q_number": 4, "bbox_norm": [72, 215, 890, 245]},
        ],
    }

    bands = compute_question_page_bands(
        page_result,
        page_width=1000,
        page_height=2000,
        padding_px=20,
        question_start_y_by_number={2: 300, 3: 600, 4: 900},
    )

    assert bands[1]["q_number"] == 3
    assert bands[1]["crop_box"] == [0, 580, 1000, 880]


def test_compute_question_page_bands_keeps_next_pdf_question_out_of_crop():
    page_result = {
        "page_index": 0,
        "fragments": [
            {"q_number": 1, "bbox_norm": [80, 70, 915, 145]},
            {"q_number": 2, "bbox_norm": [80, 125, 915, 190]},
        ],
    }

    bands = compute_question_page_bands(
        page_result,
        page_width=1000,
        page_height=2000,
        padding_px=20,
        question_start_y_by_number={1: 120, 2: 250},
    )

    assert bands[0]["q_number"] == 1
    assert bands[0]["crop_box"] == [0, 100, 1000, 230]


def test_compute_question_page_bands_expands_diagram_question_above_text_bbox():
    page_result = {
        "page_index": 0,
        "fragments": [
            {"q_number": 10, "bbox_norm": [100, 350, 900, 900], "has_diagram": True},
        ],
    }

    bands = compute_question_page_bands(page_result, page_width=1000, page_height=2000, padding_px=20)

    assert bands[0]["crop_box"] == [0, 0, 1000, 2000]


def test_build_review_crops_for_payload_writes_question_folders(tmp_path: Path):
    render_dir = tmp_path / "renders"
    render_dir.mkdir()
    image_path = render_dir / "page_001.png"
    Image.new("RGB", (100, 200), "white").save(image_path)

    payload_path = tmp_path / "sample_page_chain.json"
    payload_path.write_text(
        json.dumps(
            {
                "pdf_path": "data/past-papers/9709Mathematics/paper1/sample.pdf",
                "page_results": [
                    {
                        "page_index": 0,
                        "source_page_index": 0,
                        "rendered_page_path": str(image_path),
                        "fragments": [
                            {"q_number": 1, "bbox_norm": [100, 100, 900, 300]},
                            {"q_number": 2, "bbox_norm": [100, 600, 900, 800]},
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    summary = build_review_crops_for_payload(
        payload_path,
        output_root=tmp_path / "review",
        workspace_root=tmp_path,
        padding_px=0,
    )

    assert summary["question_count"] == 2
    assert (tmp_path / "review" / "sample" / "q01" / "q01_page_001.png").exists()
    assert (tmp_path / "review" / "sample" / "q02" / "q02_page_001.png").exists()
    assert (tmp_path / "review" / "sample" / "index.json").exists()


def test_build_review_crops_rebuilds_payload_before_cropping(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    render_dir = tmp_path / "renders"
    render_dir.mkdir()
    image_path = render_dir / "page_001.png"
    Image.new("RGB", (100, 200), "white").save(image_path)

    payload_path = tmp_path / "sample_page_chain.json"
    payload_path.write_text(
        json.dumps(
            {
                "pdf_path": "data/past-papers/9709Mathematics/paper1/sample.pdf",
                "page_results": [
                    {
                        "page_index": 0,
                        "source_page_index": 0,
                        "rendered_page_path": str(image_path),
                        "fragments": [{"q_number": 5, "bbox_norm": [100, 100, 900, 300]}],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    def fake_rebuild(payload):
        rebuilt = dict(payload)
        rebuilt["page_results"] = [
            {
                **payload["page_results"][0],
                "fragments": [{"q_number": 7, "bbox_norm": [100, 100, 900, 300]}],
            }
        ]
        return rebuilt

    monkeypatch.setattr(review_crops, "rebuild_payload_from_page_results", fake_rebuild)

    build_review_crops_for_payload(payload_path, output_root=tmp_path / "review", workspace_root=tmp_path)

    assert (tmp_path / "review" / "sample" / "q07" / "q07_page_001.png").exists()
    assert not (tmp_path / "review" / "sample" / "q05").exists()
