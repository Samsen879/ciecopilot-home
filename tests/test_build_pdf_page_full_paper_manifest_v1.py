from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.build_pdf_page_full_paper_manifest_v1 import (  # noqa: E402
    build_full_paper_manifest,
    parse_pdf_identity,
    write_manifest,
)


def test_parse_pdf_identity_accepts_wm_prefixed_pdf_name():
    identity = parse_pdf_identity(Path("WM_9709_s20_qp_13.pdf"))

    assert identity.subject_code == "9709"
    assert identity.session == "s"
    assert identity.year == 2020
    assert identity.paper == 1
    assert identity.variant == 3
    assert identity.pdf_stem == "9709_s20_qp_13"


def test_build_full_paper_manifest_includes_found_questions_and_audit(tmp_path):
    pdf_path = tmp_path / "9709_s24_qp_13.pdf"
    pdf_path.write_bytes(b"%PDF fake")

    text_pages = [
        ["cover"],
        ["2", "1", "Find the coefficient. [4]"],
        ["3", "2", "The diagram shows the curve.", "(a) Find A. [3]"],
        ["4", "4", "This later question should be ignored when q3 is absent. [5]"],
    ]

    manifest = build_full_paper_manifest(
        pdf_path,
        max_question_number=4,
        text_page_loader=lambda _pdf_path: text_pages,
    )

    assert manifest["manifest_id"] == "9709_s24_qp_13_full_pdf_page_v1"
    assert [item["storage_key"] for item in manifest["items"]] == [
        "9709/s24_qp_13/questions/q01.png",
        "9709/s24_qp_13/questions/q02.png",
        "9709/s24_qp_13/questions/q04.png",
    ]
    assert manifest["locator_audit"]["summary"] == {
        "targeted_questions": 4,
        "found": 3,
        "included": 3,
        "missing": 1,
        "multi_page": 0,
        "low_score": 0,
        "excluded_low_score": 0,
    }
    missing = [entry for entry in manifest["locator_audit"]["entries"] if not entry["found"]]
    assert missing[0]["q_number"] == 3


def test_build_full_paper_manifest_excludes_low_score_hits_from_items(tmp_path):
    pdf_path = tmp_path / "9709_s17_qp_11.pdf"
    pdf_path.write_bytes(b"%PDF fake")

    text_pages = [
        ["cover"],
        [
            "2",
            "1",
            "Find the coefficient of x in the expansion.",
            "[3]",
        ],
    ]

    manifest = build_full_paper_manifest(
        pdf_path,
        max_question_number=1,
        low_score_threshold=60,
        text_page_loader=lambda _pdf_path: text_pages,
    )

    assert "9709/s17_qp_11/questions/q01.png" not in [
        item["storage_key"] for item in manifest["items"]
    ]
    q1 = manifest["locator_audit"]["entries"][0]
    assert q1["q_number"] == 1
    assert q1["found"] is True
    assert q1["included"] is False
    assert "low_locator_score" in q1["warnings"]
    assert manifest["locator_audit"]["summary"]["included"] == 0
    assert manifest["locator_audit"]["summary"]["excluded_low_score"] == 1


def test_write_manifest_round_trips_json(tmp_path):
    output = tmp_path / "manifest.json"
    payload = {
        "manifest_id": "m1",
        "items": [],
        "locator_audit": {"summary": {}},
    }

    write_manifest(output, payload)

    assert json.loads(output.read_text(encoding="utf-8")) == payload
