from scripts.vlm.run_9709_targeted_visual_review_v1 import (
    build_visual_dispositions,
    build_visual_review_request,
    merge_visual_review_payloads,
)


def test_build_visual_review_request_explains_combined_stack_semantics():
    request = build_visual_review_request(
        review_item={
            "storage_key": "9709/s23_qp_21/questions/q07.png",
            "q_number": 7,
            "review_reasons": ["multi_page_question"],
            "review_crop_paths": [
                "tmp/crops/q07_page_010.png",
                "tmp/crops/q07_page_011.png",
            ],
        },
        stack_image_path="tmp/stacks/q07_targeted.png",
        model="qwen-test",
        include_individual_crop_images=True,
    )

    content = request["messages"][0]["content"]
    prompt = content[0]["text"]
    assert "single vertical stack image containing 2 labeled crop(s)" in prompt
    assert "Do not reject merely because only one combined PNG is attached" in prompt
    assert [part.get("image_path") for part in content if part.get("type") == "image_path"] == [
        "tmp/stacks/q07_targeted.png",
        "tmp/crops/q07_page_010.png",
        "tmp/crops/q07_page_011.png",
    ]


def test_merge_visual_review_payloads_replaces_retried_items_in_place():
    base_payload = {
        "schema_version": "9709_targeted_visual_vlm_review_v1",
        "generated_on": "2026-05-30",
        "shard_id": "p2_s_standard_001",
        "source_review": "docs/reports/post-extraction.json",
        "model": "qwen-test",
        "items": [
            {"storage_key": "q1", "status": "accepted"},
            {"storage_key": "q2", "status": "rejected", "vlm_notes": "old"},
        ],
    }
    retry_payload = {
        "schema_version": "9709_targeted_visual_vlm_review_v1",
        "generated_on": "2026-05-30",
        "shard_id": "p2_s_standard_001",
        "source_review": "docs/reports/post-extraction.json",
        "model": "qwen-test",
        "items": [
            {"storage_key": "q2", "status": "accepted", "vlm_notes": "retry"},
        ],
    }

    merged = merge_visual_review_payloads(base_payload, retry_payload)

    assert [item["storage_key"] for item in merged["items"]] == ["q1", "q2"]
    assert merged["items"][1]["vlm_notes"] == "retry"
    assert merged["summary"] == {"items": 2, "accepted": 2, "rejected": 0}


def test_build_visual_dispositions_records_required_checks_for_accepted_items():
    review_payload = {
        "schema_version": "9709_targeted_visual_vlm_review_v1",
        "generated_on": "2026-05-30",
        "shard_id": "p2_s_standard_001",
        "source_review": "docs/reports/post-extraction.json",
        "items": [
            {
                "storage_key": "9709/s24_qp_23/questions/q07.png",
                "source_pdf_path": "data/past-papers/9709Mathematics/paper2/9709_s24_qp_23.pdf",
                "q_number": 7,
                "review_reasons": ["diagram_lane", "multi_page_question"],
                "page_indices": [12, 13],
                "review_crop_paths": [
                    "tmp/pdf-page-chain/full-scaleout/p2_s_standard_001/review-crops/9709_s24_qp_23/q07/q07_page_013.png",
                    "tmp/pdf-page-chain/full-scaleout/p2_s_standard_001/review-crops/9709_s24_qp_23/q07/q07_page_014.png",
                ],
                "targeted_stack_image_path": "tmp/pdf-page-chain/full-scaleout/p2_s_standard_001/targeted-visual-review/9709_s24_qp_23_questions_q07_targeted.png",
                "status": "accepted",
                "vlm_checked": {
                    "question_boundary_accepted": True,
                    "diagram_presence_accepted": True,
                    "cross_page_continuity_accepted": True,
                },
                "vlm_warnings": [],
                "vlm_notes": "The question boundary, diagram, and continuation are visible.",
            },
        ],
    }

    dispositions = build_visual_dispositions(
        review_payload,
        manifest_id="9709_full_scaleout_manifest_v1_p2_s_standard_001_page_chain_surface_v1",
        evidence_review_path="docs/reports/targeted-visual.json",
        reviewed_on="2026-05-30",
    )

    assert dispositions["summary"] == {
        "items": 1,
        "accepted": 1,
        "rejected": 0,
        "accepted_review_reason_counts": {
            "diagram_lane": 1,
            "multi_page_question": 1,
        },
        "paper_counts": {"s24_qp_23": 1},
    }
    assert dispositions["items"][0]["disposition"] == "accepted"
    assert dispositions["items"][0]["accepted_review_reasons"] == [
        "diagram_lane",
        "multi_page_question",
    ]
    assert dispositions["items"][0]["visual_checks"] == {
        "question_boundary_accepted": True,
        "diagram_presence_accepted": True,
        "cross_page_continuity_accepted": True,
    }


def test_build_visual_dispositions_marks_warning_disposition_as_accepted():
    review_payload = {
        "schema_version": "9709_targeted_visual_vlm_review_v1",
        "generated_on": "2026-05-30",
        "shard_id": "p4_s_standard_001",
        "source_review": "docs/reports/post-extraction.json",
        "items": [
            {
                "storage_key": "9709/s16_qp_43/questions/q06.png",
                "source_pdf_path": "data/past-papers/9709Mathematics/paper4/9709_s16_qp_43.pdf",
                "q_number": 6,
                "review_reasons": ["warning_disposition"],
                "page_indices": [2],
                "review_crop_paths": [
                    "tmp/pdf-page-chain/full-scaleout/p4_s_standard_001/review-crops/9709_s16_qp_43/q06/q06_page_003.png",
                ],
                "targeted_stack_image_path": "tmp/pdf-page-chain/full-scaleout/p4_s_standard_001/targeted-stacks/s16_qp_43_questions_q06_targeted.png",
                "status": "accepted",
                "vlm_checked": {
                    "question_boundary_accepted": True,
                },
                "vlm_warnings": ["warning_disposition"],
                "vlm_notes": "The normalized warning disposition is visually consistent.",
            },
        ],
    }

    dispositions = build_visual_dispositions(
        review_payload,
        manifest_id="9709_full_scaleout_manifest_v1_p4_s_standard_001_page_chain_surface_v1",
        evidence_review_path="docs/reports/targeted-visual.json",
        reviewed_on="2026-05-30",
    )

    assert dispositions["items"][0]["visual_checks"] == {
        "question_boundary_accepted": True,
        "warning_disposition_accepted": True,
    }
