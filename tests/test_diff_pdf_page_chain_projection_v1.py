from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.diff_pdf_page_chain_projection_v1 import build_diff_report  # noqa: E402


def test_build_diff_report_flags_diagram_flip_and_stale_alignment(tmp_path):
    projection_path = tmp_path / "projection.json"
    projection_path.write_text(
        json.dumps(
            {
                "schema_version": "9709_pdf_page_chain_projection_v1",
                "items": [
                    {
                        "storage_key": "9709/m16_qp_12/questions/q08.png",
                        "source_pdf_path": "paper.pdf",
                        "q_number": 8,
                        "ocr_text": "8 New extracted question text with a diagram.",
                        "diagram_present": True,
                        "diagram_elements": ["graph"],
                        "page_indices": [2],
                        "marks": [4],
                        "subpart_labels": [],
                        "source_rendered_page_paths": ["page_002.png"],
                        "old": {
                            "manifest_diagram_present": False,
                            "evidence_ocr_text": "8 Old extracted question text.",
                            "evidence_diagram_present": False,
                            "evidence_diagram_elements": [],
                            "overall_alignment_verdict": "ready",
                        },
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    report = build_diff_report(projection_path=projection_path)

    row = report["items"][0]
    assert row["diff_classes"] == [
        "text_changed",
        "diagram_changed",
        "structure_changed",
    ]
    assert row["requires_human_review"] is True
    assert row["old_alignment_verdict_stale"] is True
    assert report["class_counts"]["diagram_changed"] == 1
    assert report["requires_human_review_count"] == 1


def test_build_diff_report_marks_missing_old_evidence(tmp_path):
    projection_path = tmp_path / "projection.json"
    projection_path.write_text(
        json.dumps(
            {
                "items": [
                    {
                        "storage_key": "s",
                        "source_pdf_path": "paper.pdf",
                        "q_number": 1,
                        "ocr_text": "1 A reasonably long extracted question text.",
                        "diagram_present": False,
                        "diagram_elements": [],
                        "page_indices": [1],
                        "marks": [3],
                        "subpart_labels": [],
                        "old": {
                            "manifest_diagram_present": None,
                            "evidence_ocr_text": "",
                            "evidence_diagram_present": None,
                            "overall_alignment_verdict": "ready",
                        },
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    report = build_diff_report(projection_path=projection_path)

    row = report["items"][0]
    assert row["diff_classes"] == ["missing_old_evidence"]
    assert row["requires_human_review"] is True
    assert row["old_alignment_verdict_stale"] is True
    assert report["class_counts"]["missing_old_evidence"] == 1
