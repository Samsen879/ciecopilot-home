from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from scripts.vlm.run_9231_visual_review_wave1_vlm import (
    build_visual_review_request,
    build_wave1_review_items_from_surface,
    run_visual_review_items,
)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _write_png(path: Path, size: tuple[int, int] = (100, 140)) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, "white").save(path)


def test_build_wave1_review_items_from_surface_preserves_9231_row_identity(tmp_path):
    crop_path = tmp_path / "data/crops/9231-pilot-shards/9231_p1_s25_standard_001/q01.png"
    _write_png(crop_path)
    surface_path = tmp_path / "data/manifests/9231_p1_s25_standard_001_page_chain_surface_v1.json"
    _write_json(
        surface_path,
        {
            "shard_id": "9231_p1_s25_standard_001",
            "items": [
                {
                    "storage_key": "9231/s25_qp_11/questions/q01.png",
                    "source_pdf": "data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf",
                    "q_number": 1,
                    "page_numbers": [2],
                    "crop_status": "complete",
                    "review_crop_paths": [str(crop_path.relative_to(tmp_path))],
                    "crop_paths": [str(crop_path.relative_to(tmp_path))],
                    "rendered_pdf_page_paths": [],
                },
            ],
        },
    )

    items = build_wave1_review_items_from_surface(surface_path, root_dir=tmp_path)

    assert items == [
        {
            "storage_key": "9231/s25_qp_11/questions/q01.png",
            "source_pdf_path": "data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf",
            "shard_id": "9231_p1_s25_standard_001",
            "q_number": 1,
            "page_numbers": [2],
            "review_crop_paths": [str(crop_path.relative_to(tmp_path))],
            "review_reasons": ["9231_wave1_crop_boundary", "question_legibility"],
        },
    ]


def test_build_visual_review_request_uses_9231_prompt_and_json_contract():
    request = build_visual_review_request(
        review_item={
            "storage_key": "9231/s25_qp_11/questions/q01.png",
            "q_number": 1,
            "page_numbers": [2, 3],
            "review_crop_paths": ["q01_page_002.png", "q01_page_003.png"],
            "review_reasons": ["9231_wave1_crop_boundary", "question_legibility"],
        },
        stack_image_path="tmp/9231/q01_targeted.png",
        model="qwen-test",
        include_individual_crop_images=True,
    )

    assert request["model"] == "qwen-test"
    assert request["response_format"] == {"type": "json_object"}
    content = request["messages"][0]["content"]
    prompt = content[0]["text"]
    assert "Cambridge 9231 Further Mathematics" in prompt
    assert "Return one valid JSON object only" in prompt
    assert "Do not solve the problem" in prompt
    assert [part.get("image_path") for part in content if part.get("type") == "image_path"] == [
        "tmp/9231/q01_targeted.png",
        "q01_page_002.png",
        "q01_page_003.png",
    ]


def test_run_visual_review_items_writes_vlm_provenance_and_disposition(tmp_path):
    crop_path = tmp_path / "data/crops/9231-pilot-shards/9231_p1_s25_standard_001/q01.png"
    _write_png(crop_path)
    review_item = {
        "storage_key": "9231/s25_qp_11/questions/q01.png",
        "source_pdf_path": "data/past-papers/9231Further-Mathematics/paper1/9231_s25_qp_11.pdf",
        "shard_id": "9231_p1_s25_standard_001",
        "q_number": 1,
        "page_numbers": [2],
        "review_crop_paths": [str(crop_path)],
        "review_reasons": ["9231_wave1_crop_boundary", "question_legibility"],
    }
    calls = []

    def fake_client(request):
        calls.append(request)
        return {
            "id": "chatcmpl-test",
            "model": "qwen-test",
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "accepted": True,
                                "blockers": [],
                                "warnings": [],
                                "notes": "The crop is legible and contains the printed question boundary.",
                                "checked": {
                                    "question_boundary_accepted": True,
                                    "visual_legibility_accepted": True,
                                    "cross_page_continuity_accepted": None,
                                    "diagram_or_table_presence_accepted": None,
                                },
                            },
                        ),
                    },
                },
            ],
        }

    payload = run_visual_review_items(
        review_items=[review_item],
        output_root=tmp_path / "tmp/9231-visual/stacks",
        json_out=tmp_path / "docs/reports/visual.json",
        model="qwen-test",
        generated_on="2026-06-05",
        client=fake_client,
    )

    assert len(calls) == 1
    assert payload["summary"] == {"items": 1, "accepted": 1, "rejected": 0}
    item = payload["items"][0]
    assert item["status"] == "accepted"
    assert item["reviewed_by"] == "qwen_vlm_external_authorized"
    assert item["external_vlm_or_api_used"] is True
    assert item["vlm_response_id"] == "chatcmpl-test"
    assert Path(item["targeted_stack_image_path"]).exists()
    persisted = json.loads((tmp_path / "docs/reports/visual.json").read_text(encoding="utf-8"))
    assert persisted["items"][0]["vlm_checked"]["visual_legibility_accepted"] is True
