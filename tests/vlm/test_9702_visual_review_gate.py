from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
RUNNER_PATH = ROOT / "scripts/vlm/run_9702_visual_review_vlm_v1.py"
GATE_PATH = ROOT / "scripts/vlm/build_9702_visual_review_gate_v1.py"


def _load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _write_png(path: Path, size: tuple[int, int] = (120, 160)) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", size, "white")
    image.putpixel((10, 10), (0, 0, 0))
    image.save(path)


def _phase4_manifest(tmp_path: Path, crop_path: Path) -> Path:
    manifest_path = tmp_path / "data/manifests/9702_full_row_surface_2026_06_09_manifest_v1.json"
    _write_json(
        manifest_path,
        {
            "schema_version": "9702_full_row_surface_manifest_v1",
            "generated_on": "2026-06-09",
            "subject_code": "9702",
            "production_ready_claimed": False,
            "item_count": 1,
            "items": [
                {
                    "storage_key": "9702/s25_qp_11/questions/q01.png",
                    "subject_code": "9702",
                    "paper": 1,
                    "session_year": "s25",
                    "component": "11",
                    "source_pdf": "data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf",
                    "source_pdf_stem": "9702_s25_qp_11",
                    "source_locator_surface_manifest_path": "data/manifests/9702_p1_s_promoted_public_001_page_chain_surface_v1.json",
                    "q_number": 1,
                    "page_numbers": [4],
                    "page_range": {"start_page_number": 4, "end_page_number": 4},
                    "crop_status": "complete",
                    "review_crop_paths": [str(crop_path.relative_to(tmp_path))],
                    "crop_paths": [str(crop_path.relative_to(tmp_path))],
                    "rendered_pdf_page_paths": [],
                    "production_ready_claimed": False,
                },
            ],
        },
    )
    return manifest_path


def test_build_review_items_from_phase4_manifest_preserves_row_identity(tmp_path):
    runner = _load_module(RUNNER_PATH, "run_9702_visual_review_vlm_v1")
    crop_path = tmp_path / "data/crops/9702-full-scaleout/q01.png"
    _write_png(crop_path)
    manifest_path = _phase4_manifest(tmp_path, crop_path)

    items = runner.build_review_items_from_phase4_manifest(manifest_path, root_dir=tmp_path)

    assert items == [
        {
            "storage_key": "9702/s25_qp_11/questions/q01.png",
            "source_pdf": "data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf",
            "source_pdf_stem": "9702_s25_qp_11",
            "source_locator_surface_manifest_path": "data/manifests/9702_p1_s_promoted_public_001_page_chain_surface_v1.json",
            "shard_id": "9702_p1_s_promoted_public_001",
            "subject_code": "9702",
            "paper": 1,
            "session_year": "s25",
            "component": "11",
            "q_number": 1,
            "page_numbers": [4],
            "page_range": {"start_page_number": 4, "end_page_number": 4},
            "visual_evidence_paths": [str(crop_path.relative_to(tmp_path))],
            "review_reasons": [
                "9702_phase5_full_row_visual_boundary_acceptance",
                "question_legibility",
                "diagram_table_continuity_if_present",
            ],
        },
    ]


def test_run_visual_review_items_writes_9702_vlm_provenance(tmp_path):
    runner = _load_module(RUNNER_PATH, "run_9702_visual_review_vlm_v1")
    crop_path = tmp_path / "data/crops/9702-full-scaleout/q01.png"
    _write_png(crop_path)
    review_item = {
        "storage_key": "9702/s25_qp_11/questions/q01.png",
        "source_pdf": "data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf",
        "source_pdf_stem": "9702_s25_qp_11",
        "source_locator_surface_manifest_path": "data/manifests/9702_p1_s_promoted_public_001_page_chain_surface_v1.json",
        "shard_id": "9702_p1_s_promoted_public_001",
        "subject_code": "9702",
        "paper": 1,
        "session_year": "s25",
        "component": "11",
        "q_number": 1,
        "page_numbers": [4],
        "page_range": {"start_page_number": 4, "end_page_number": 4},
        "visual_evidence_paths": [str(crop_path)],
        "review_reasons": ["9702_phase5_full_row_visual_boundary_acceptance"],
    }

    def fake_client(request):
        prompt = request["messages"][0]["content"][0]["text"]
        assert "Cambridge 9702 Physics" in prompt
        assert "Do not transcribe" in prompt
        return {
            "id": "chatcmpl-9702-test",
            "model": "qwen-test",
            "usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120},
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "disposition": "accepted",
                                "reason": "The crop is legible and contains the full printed question boundary.",
                                "warnings": [],
                                "checked": {
                                    "question_boundary_accepted": True,
                                    "visual_legibility_accepted": True,
                                    "diagram_or_table_continuity_accepted": True,
                                    "full_printed_question_boundary_distinguishable": True,
                                },
                            },
                        ),
                    },
                },
            ],
        }

    payload = runner.run_visual_review_items(
        review_items=[review_item],
        json_out=tmp_path / "docs/reports/visual.json",
        model="qwen-test",
        generated_on="2026-06-09",
        root_dir=tmp_path,
        client=fake_client,
    )

    assert payload["summary"] == {
        "selected_rows": 1,
        "reviewed_rows": 1,
        "accepted_rows": 1,
        "rejected_rows": 0,
        "ambiguous_rows": 0,
        "vlm_usage": {"completion_tokens": 20, "prompt_tokens": 100, "total_tokens": 120},
    }
    item = payload["items"][0]
    assert item["visual_review_status"] == "accepted"
    assert item["review_method"] == "external_vlm"
    assert item["external_vlm_or_api_used"] is True
    assert item["vlm_model"] == "qwen-test"
    assert item["vlm_transport"] == "qwen_openai_client_v1"
    assert item["vlm_response_id"] == "chatcmpl-9702-test"
    assert item["production_ready_claimed"] is False


def test_visual_review_prompts_treat_official_blank_pages_as_boundary_evidence():
    runner = _load_module(RUNNER_PATH, "run_9702_visual_review_vlm_v1")
    review_item = {
        "storage_key": "9702/m17_qp_12/questions/q40.png",
        "source_pdf": "data/past-papers/9702Physics/paper1/9702_m17_qp_12.pdf",
        "q_number": 40,
        "page_numbers": [18, 19, 20],
        "page_range": {"start_page_number": 18, "end_page_number": 20},
        "visual_evidence_paths": [
            "q40_page_018.png",
            "q40_page_019.png",
            "q40_page_020.png",
        ],
        "review_reasons": ["9702_phase5_full_row_visual_boundary_acceptance"],
    }

    single = runner.build_visual_review_request(review_item=review_item, model="qwen-test")
    single_prompt = single["messages"][0]["content"][0]["text"]
    assert "officially printed BLANK PAGE" in single_prompt
    assert "acceptable boundary evidence" in single_prompt
    assert "truly blank image files" in single_prompt

    batch = runner.build_batch_visual_review_request(review_items=[review_item], model="qwen-test")
    batch_prompt = batch["messages"][0]["content"][0]["text"]
    assert "officially printed BLANK PAGE" in batch_prompt
    assert "acceptable boundary evidence" in batch_prompt
    assert "truly blank image files" in batch_prompt


def test_resume_existing_keeps_only_accepted_rows_for_retry(tmp_path):
    runner = _load_module(RUNNER_PATH, "run_9702_visual_review_vlm_v1")
    existing_path = tmp_path / "docs/reports/visual.json"
    _write_json(
        existing_path,
        {
            "items": [
                {
                    "storage_key": "9702/s25_qp_11/questions/q01.png",
                    "visual_review_status": "accepted",
                },
                {
                    "storage_key": "9702/s25_qp_11/questions/q40.png",
                    "visual_review_status": "ambiguous",
                },
            ],
        },
    )

    items = runner._load_existing_items(existing_path, accepted_only=True)

    assert [item["storage_key"] for item in items] == ["9702/s25_qp_11/questions/q01.png"]


def test_resume_existing_reuses_only_rows_matching_current_inventory_identity():
    runner = _load_module(RUNNER_PATH, "run_9702_visual_review_vlm_v1")
    current_item = {
        "storage_key": "9702/w17_qp_21/questions/q07.png",
        "source_pdf": "data/past-papers/9702Physics/paper2/9702_w17_qp_21.pdf",
        "source_locator_surface_manifest_path": "data/manifests/9702_p2_w_promoted_public_021_page_chain_surface_v1.json",
        "q_number": 7,
        "page_numbers": [14, 15],
        "visual_evidence_paths": [
            "data/crops/9702-full-scaleout/question-crops/9702_w17_qp_21/q07/q07_page_014.png",
            "data/crops/9702-full-scaleout/question-crops/9702_w17_qp_21/q07/q07_page_015.png",
        ],
    }
    matching_existing = {
        **current_item,
        "visual_review_status": "accepted",
        "vlm_response_id": "chatcmpl-current",
    }
    stale_evidence = {
        **matching_existing,
        "visual_evidence_paths": [
            "data/crops/9702-full-scaleout/question-crops/9702_w17_qp_21/q07/q07_page_014.png",
            "data/crops/9702-full-scaleout/question-crops/9702_w17_qp_21/q07/q07_page_015.png",
            "data/crops/9702-full-scaleout/question-crops/9702_w17_qp_21/q07/q07_page_016.png",
        ],
        "vlm_response_id": "chatcmpl-stale-evidence",
    }
    stale_page_numbers = {
        **matching_existing,
        "page_numbers": [14, 15, 16],
        "vlm_response_id": "chatcmpl-stale-pages",
    }
    rejected_existing = {
        **current_item,
        "visual_review_status": "rejected",
        "vlm_response_id": "chatcmpl-rejected",
    }

    resume = runner.filter_resume_items_for_current_inventory(
        existing_items=[matching_existing, stale_evidence, stale_page_numbers, rejected_existing],
        current_review_items=[current_item],
    )

    assert resume["items"] == [matching_existing]
    assert resume["stats"] == {
        "previous_item_count": 4,
        "accepted_results": 3,
        "matched_current_rows": 1,
        "stale_accepted_retried": 2,
        "nonaccepted_retried": 1,
    }


def test_run_visual_review_items_batches_multiple_rows_with_shared_response_id(tmp_path):
    runner = _load_module(RUNNER_PATH, "run_9702_visual_review_vlm_v1")
    crop_paths = [
        tmp_path / "data/crops/9702-full-scaleout/q01.png",
        tmp_path / "data/crops/9702-full-scaleout/q02.png",
    ]
    for crop_path in crop_paths:
        _write_png(crop_path)
    review_items = [
        {
            "storage_key": f"9702/s25_qp_11/questions/q0{index}.png",
            "source_pdf": "data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf",
            "source_pdf_stem": "9702_s25_qp_11",
            "source_locator_surface_manifest_path": "data/manifests/9702_p1_s_promoted_public_001_page_chain_surface_v1.json",
            "shard_id": "9702_p1_s_promoted_public_001",
            "subject_code": "9702",
            "paper": 1,
            "session_year": "s25",
            "component": "11",
            "q_number": index,
            "page_numbers": [index + 3],
            "page_range": {"start_page_number": index + 3, "end_page_number": index + 3},
            "visual_evidence_paths": [str(crop_paths[index - 1])],
            "review_reasons": ["9702_phase5_full_row_visual_boundary_acceptance"],
        }
        for index in [1, 2]
    ]
    calls = []

    def fake_client(request):
        calls.append(request)
        prompt = request["messages"][0]["content"][0]["text"]
        assert "Return one valid JSON object only" in prompt
        assert "items" in prompt
        return {
            "id": "chatcmpl-9702-batch",
            "model": "qwen-test",
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "items": [
                                    {
                                        "storage_key": item["storage_key"],
                                        "disposition": "accepted",
                                        "reason": "The crop is legible.",
                                        "warnings": [],
                                        "checked": {
                                            "question_boundary_accepted": True,
                                            "visual_legibility_accepted": True,
                                            "diagram_or_table_continuity_accepted": None,
                                            "full_printed_question_boundary_distinguishable": True,
                                        },
                                    }
                                    for item in review_items
                                ],
                            },
                        ),
                    },
                },
            ],
        }

    payload = runner.run_visual_review_items(
        review_items=review_items,
        json_out=tmp_path / "docs/reports/visual.json",
        model="qwen-test",
        generated_on="2026-06-09",
        root_dir=tmp_path,
        client=fake_client,
        batch_size=2,
    )

    assert len(calls) == 1
    assert payload["summary"]["accepted_rows"] == 2
    assert [item["vlm_response_id"] for item in payload["items"]] == [
        "chatcmpl-9702-batch",
        "chatcmpl-9702-batch",
    ]
    assert [item["vlm_batch_index"] for item in payload["items"]] == [1, 1]


def test_run_visual_review_items_can_stop_after_nonaccepted_batch(tmp_path):
    runner = _load_module(RUNNER_PATH, "run_9702_visual_review_vlm_v1")
    crop_paths = [
        tmp_path / "data/crops/9702-full-scaleout/q01.png",
        tmp_path / "data/crops/9702-full-scaleout/q02.png",
    ]
    for crop_path in crop_paths:
        _write_png(crop_path)
    review_items = [
        {
            "storage_key": f"9702/s25_qp_11/questions/q0{index}.png",
            "source_pdf": "data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf",
            "q_number": index,
            "visual_evidence_paths": [str(crop_paths[index - 1])],
        }
        for index in [1, 2]
    ]

    def fake_client(_request):
        return {
            "id": "chatcmpl-stop",
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "items": [
                                    {
                                        "storage_key": review_items[0]["storage_key"],
                                        "disposition": "accepted",
                                        "reason": "Legible.",
                                        "warnings": [],
                                        "checked": {},
                                    },
                                    {
                                        "storage_key": review_items[1]["storage_key"],
                                        "disposition": "ambiguous",
                                        "reason": "Boundary unclear.",
                                        "warnings": ["boundary_unclear"],
                                        "checked": {},
                                    },
                                ],
                            },
                        ),
                    },
                },
            ],
        }

    payload = runner.run_visual_review_items(
        review_items=review_items,
        json_out=tmp_path / "docs/reports/visual.json",
        model="qwen-test",
        generated_on="2026-06-09",
        root_dir=tmp_path,
        client=fake_client,
        batch_size=2,
        stop_on_nonaccepted=True,
    )

    assert payload["summary"]["reviewed_rows"] == 2
    assert payload["summary"]["ambiguous_rows"] == 1
    persisted = json.loads((tmp_path / "docs/reports/visual.json").read_text(encoding="utf-8"))
    assert persisted["summary"]["ambiguous_rows"] == 1


def test_visual_review_gate_passes_complete_accepted_inventory_and_writes_sidecar(tmp_path):
    gate = _load_module(GATE_PATH, "build_9702_visual_review_gate_v1")
    crop_path = tmp_path / "data/crops/9702-full-scaleout/q01.png"
    _write_png(crop_path)
    manifest_path = _phase4_manifest(tmp_path, crop_path)
    review_path = tmp_path / "docs/reports/2026-06-09-9702-visual-review-vlm.json"
    _write_json(
        review_path,
        {
            "schema_version": "9702_visual_review_vlm_v1",
            "generated_on": "2026-06-09",
            "subject_code": "9702",
            "review_method": "external_vlm",
            "model": "qwen-test",
            "transport": "qwen_openai_client_v1",
            "production_ready_claimed": False,
            "summary": {
                "selected_rows": 1,
                "reviewed_rows": 1,
                "accepted_rows": 1,
                "rejected_rows": 0,
                "ambiguous_rows": 0,
            },
            "items": [
                {
                    "storage_key": "9702/s25_qp_11/questions/q01.png",
                    "source_pdf": "data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf",
                    "source_locator_surface_manifest_path": "data/manifests/9702_p1_s_promoted_public_001_page_chain_surface_v1.json",
                    "q_number": 1,
                    "page_numbers": [4],
                    "visual_evidence_paths": [str(crop_path.relative_to(tmp_path))],
                    "visual_review_status": "accepted",
                    "review_reason": "accepted by VLM",
                    "review_method": "external_vlm",
                    "external_vlm_or_api_used": True,
                    "vlm_model": "qwen-test",
                    "vlm_transport": "qwen_openai_client_v1",
                    "vlm_response_id": "chatcmpl-9702-test",
                    "production_ready_claimed": False,
                },
            ],
        },
    )

    result = gate.build_gate(
        workspace_root=tmp_path,
        generated_on="2026-06-09",
        phase4_manifest_path=manifest_path,
        review_json_path=review_path,
        sidecar_manifest_path=tmp_path / "data/manifests/9702_visual_review_2026_06_09_manifest_v1.json",
        gate_json_path=tmp_path / "docs/reports/2026-06-09-9702-visual-review-gate.json",
        gate_md_path=tmp_path / "docs/reports/2026-06-09-9702-visual-review-gate.md",
    )

    assert result["gate_status"] == "passed"
    assert result["counts"]["selected_rows"] == 1
    assert result["counts"]["accepted_rows"] == 1
    assert result["counts"]["duplicate_visual_review_storage_keys"] == 0
    assert result["counts"]["blocker_count"] == 0
    sidecar = json.loads(
        (tmp_path / "data/manifests/9702_visual_review_2026_06_09_manifest_v1.json").read_text(encoding="utf-8")
    )
    assert sidecar["items"][0]["visual_review_status"] == "accepted"
    assert sidecar["production_ready_claimed"] is False


def test_visual_review_gate_blocks_ambiguous_or_missing_review(tmp_path):
    gate = _load_module(GATE_PATH, "build_9702_visual_review_gate_v1")
    crop_path = tmp_path / "data/crops/9702-full-scaleout/q01.png"
    _write_png(crop_path)
    manifest_path = _phase4_manifest(tmp_path, crop_path)
    review_path = tmp_path / "docs/reports/visual.json"
    _write_json(
        review_path,
        {
            "schema_version": "9702_visual_review_vlm_v1",
            "generated_on": "2026-06-09",
            "subject_code": "9702",
            "production_ready_claimed": False,
            "items": [
                {
                    "storage_key": "9702/s25_qp_11/questions/q01.png",
                    "source_pdf": "data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf",
                    "q_number": 1,
                    "visual_evidence_paths": [str(crop_path.relative_to(tmp_path))],
                    "visual_review_status": "ambiguous",
                    "review_method": "external_vlm",
                    "production_ready_claimed": False,
                },
            ],
        },
    )

    result = gate.build_gate(
        workspace_root=tmp_path,
        generated_on="2026-06-09",
        phase4_manifest_path=manifest_path,
        review_json_path=review_path,
        sidecar_manifest_path=tmp_path / "data/manifests/sidecar.json",
        gate_json_path=tmp_path / "docs/reports/gate.json",
        gate_md_path=tmp_path / "docs/reports/gate.md",
    )

    assert result["gate_status"] == "blocked"
    assert result["counts"]["ambiguous_rows"] == 1
    assert result["counts"]["blocker_count"] > 0
    assert result["blockers"]["rows"][0]["type"] == "nonaccepted_visual_review_status"
    assert result["blockers"]["rows"][0]["visual_review_status"] == "ambiguous"
