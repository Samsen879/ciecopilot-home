from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.project_pdf_page_chain_to_manifest_v1 import (  # noqa: E402
    ProjectionError,
    build_projection,
)


def _write_json(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def test_build_projection_joins_manifest_item_to_page_chain_question(tmp_path):
    manifest_path = _write_json(
        tmp_path / "manifest.json",
        {
            "schema_version": "manifest_test",
            "items": [
                {
                    "storage_key": "9709/m16_qp_12/questions/q08.png",
                    "syllabus_code": "9709",
                    "year": 2016,
                    "session": "m",
                    "paper": 1,
                    "variant": 2,
                    "q_number": 8,
                    "diagram_present": False,
                    "overall_alignment_verdict": "ready",
                }
            ],
        },
    )
    audit_path = _write_json(
        tmp_path / "audit.json",
        {
            "schema_version": "audit_test",
            "items": [
                {
                    "storage_key": "9709/m16_qp_12/questions/q08.png",
                    "pdf_path": "data/past-papers/9709Mathematics/paper1/9709_m16_qp_12.pdf",
                    "q_number": 8,
                }
            ],
        },
    )
    payload_dir = tmp_path / "payloads"
    _write_json(
        payload_dir / "9709_m16_qp_12_page_chain.json",
        {
            "schema_version": "pdf_page_chain_extraction_v1",
            "pdf_path": "data/past-papers/9709Mathematics/paper1/9709_m16_qp_12.pdf",
            "model": "qwen3-vl-plus",
            "questions": [
                {
                    "q_number": 8,
                    "ocr_text": "8 Find the value of x.",
                    "has_diagram": True,
                    "diagram_elements": ["sketch"],
                    "page_indices": [2, 3],
                    "marks": [3],
                    "subpart_labels": ["(i)"],
                }
            ],
        },
    )

    projection = build_projection(
        manifest_path=manifest_path,
        resolution_audit_path=audit_path,
        payload_dir=payload_dir,
        render_root=tmp_path / "renders",
        expected_count=1,
    )

    assert projection["schema_version"] == "9709_pdf_page_chain_projection_v1"
    assert projection["item_count"] == 1
    item = projection["items"][0]
    assert item["storage_key"] == "9709/m16_qp_12/questions/q08.png"
    assert item["source_pdf_path"] == "data/past-papers/9709Mathematics/paper1/9709_m16_qp_12.pdf"
    assert item["q_number"] == 8
    assert item["ocr_text"] == "8 Find the value of x."
    assert item["diagram_present"] is True
    assert item["diagram_elements"] == ["sketch"]
    assert item["page_indices"] == [2, 3]
    assert item["marks"] == [3]
    assert item["subpart_labels"] == ["(i)"]
    assert item["extraction_model"] == "qwen3-vl-plus"
    assert item["source_rendered_page_paths"] == [
        str(tmp_path / "renders/9709_m16_qp_12/9709_m16_qp_12_page_003.png"),
        str(tmp_path / "renders/9709_m16_qp_12/9709_m16_qp_12_page_004.png"),
    ]
    assert item["old"]["manifest_diagram_present"] is False
    assert item["old"]["overall_alignment_verdict"] == "ready"


def test_build_projection_fails_when_selected_question_is_missing(tmp_path):
    manifest_path = _write_json(
        tmp_path / "manifest.json",
        {
            "items": [
                {
                    "storage_key": "9709/m16_qp_12/questions/q08.png",
                    "q_number": 8,
                }
            ],
        },
    )
    audit_path = _write_json(
        tmp_path / "audit.json",
        {
            "items": [
                {
                    "storage_key": "9709/m16_qp_12/questions/q08.png",
                    "pdf_path": "data/past-papers/9709Mathematics/paper1/9709_m16_qp_12.pdf",
                    "q_number": 8,
                }
            ],
        },
    )
    _write_json(
        tmp_path / "payloads/9709_m16_qp_12_page_chain.json",
        {
            "pdf_path": "data/past-papers/9709Mathematics/paper1/9709_m16_qp_12.pdf",
            "questions": [{"q_number": 7, "ocr_text": "7 Text", "has_diagram": False}],
        },
    )

    with pytest.raises(ProjectionError, match="no matching extracted question"):
        build_projection(
            manifest_path=manifest_path,
            resolution_audit_path=audit_path,
            payload_dir=tmp_path / "payloads",
            render_root=tmp_path / "renders",
            expected_count=1,
        )


def test_build_projection_fails_when_diagram_flag_is_not_boolean(tmp_path):
    manifest_path = _write_json(
        tmp_path / "manifest.json",
        {"items": [{"storage_key": "s", "q_number": 1}]},
    )
    audit_path = _write_json(
        tmp_path / "audit.json",
        {"items": [{"storage_key": "s", "pdf_path": "paper.pdf", "q_number": 1}]},
    )
    _write_json(
        tmp_path / "payloads/paper_page_chain.json",
        {
            "pdf_path": "paper.pdf",
            "questions": [{"q_number": 1, "ocr_text": "1 Text", "has_diagram": None}],
        },
    )

    with pytest.raises(ProjectionError, match="diagram_present cannot be resolved"):
        build_projection(
            manifest_path=manifest_path,
            resolution_audit_path=audit_path,
            payload_dir=tmp_path / "payloads",
            render_root=tmp_path / "renders",
            expected_count=1,
        )
