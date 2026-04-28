from __future__ import annotations

import json
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.question_crop_review_console import (  # noqa: E402
    _html,
    _send_bytes_response,
    build_review_manifest,
    load_review_store,
    resolve_media_path,
    save_decision,
)


class _FakeHandler:
    def __init__(self):
        self.headers: list[tuple[str, str]] = []
        self.status = None
        self.wfile = self
        self.body = b""

    def send_response(self, status):
        self.status = status

    def send_header(self, name, value):
        self.headers.append((name, value))

    def end_headers(self):
        pass

    def write(self, body):
        self.body += body


def _write_sample_batch(root: Path, workspace_root: Path) -> None:
    image_a = root / "paper_a" / "q01" / "q01_page_002.png"
    image_b = root / "paper_a" / "q02" / "q02_page_003.png"
    image_a.parent.mkdir(parents=True)
    image_b.parent.mkdir(parents=True)
    image_a.write_bytes(b"fake-png-a")
    image_b.write_bytes(b"fake-png-b")

    (root / "index.json").write_text(
        json.dumps(
            {
                "schema_version": "pdf_page_chain_review_crops_batch_v1",
                "payload_count": 1,
                "question_count": 2,
                "crop_count": 2,
                "items": [
                    {
                        "schema_version": "pdf_page_chain_review_crops_v1",
                        "pdf_stem": "paper_a",
                        "question_count": 2,
                        "crop_count": 2,
                        "records": [
                            {
                                "status": "written",
                                "q_number": 1,
                                "source_page_index": 1,
                                "crop_box": [40, 80, 1120, 1684],
                                "output_path": str(
                                    Path("tmp/review/question-review-crops/paper_a/q01/q01_page_002.png")
                                ),
                            },
                            {
                                "status": "written",
                                "q_number": 2,
                                "source_page_index": 2,
                                "crop_box": [0, 0, 37, 1684],
                                "output_path": str(
                                    Path("tmp/review/question-review-crops/paper_a/q02/q02_page_003.png")
                                ),
                            },
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    workspace_path = workspace_root / "tmp/review/question-review-crops/paper_a/q01/q01_page_002.png"
    workspace_path.parent.mkdir(parents=True)
    workspace_path.write_bytes(b"workspace-copy")


def test_build_review_manifest_groups_records_by_question(tmp_path: Path):
    root = tmp_path / "question-review-crops"
    root.mkdir()
    _write_sample_batch(root, tmp_path)

    manifest = build_review_manifest(root, workspace_root=tmp_path, reviews_path=root / "review-decisions.json")

    assert manifest["totals"] == {"payloads": 1, "questions": 2, "crops": 2, "reviewed": 0}
    assert manifest["status_counts"] == {"unreviewed": 2}
    assert [item["item_id"] for item in manifest["items"]] == ["paper_a:q01", "paper_a:q02"]
    assert manifest["items"][0]["images"][0]["media_path"] == "paper_a/q01/q01_page_002.png"
    assert manifest["items"][0]["images"][0]["source_page_index"] == 1
    assert manifest["items"][0]["images"][0]["pdf_page_number"] == 2
    assert manifest["items"][1]["warnings"] == ["narrow_crop"]


def test_save_decision_persists_status_flags_and_note(tmp_path: Path):
    root = tmp_path / "question-review-crops"
    root.mkdir()
    _write_sample_batch(root, tmp_path)
    reviews_path = root / "review-decisions.json"

    saved = save_decision(
        reviews_path,
        {
            "item_id": "paper_a:q02",
            "pdf_stem": "paper_a",
            "q_number": 2,
            "status": "fail",
            "flags": ["cutoff", "wrong_question"],
            "note": "left edge is missing",
        },
        source_root=root,
    )
    reloaded = load_review_store(reviews_path)

    assert saved["decisions"]["paper_a:q02"]["status"] == "fail"
    assert reloaded["decisions"]["paper_a:q02"]["flags"] == ["cutoff", "wrong_question"]
    assert reloaded["decisions"]["paper_a:q02"]["note"] == "left edge is missing"
    assert reloaded["source_root"] == str(root)


def test_resolve_media_path_rejects_paths_outside_review_root(tmp_path: Path):
    root = tmp_path / "question-review-crops"
    root.mkdir()

    with pytest.raises(ValueError, match="outside review root"):
        resolve_media_path(root, "../secret.png")


def test_review_actions_render_in_topbar_not_footer():
    html = _html()
    topbar = html.split('<header class="topbar">', 1)[1].split("</header>", 1)[0]
    bottom = html.split('<footer class="bottom">', 1)[1].split("</footer>", 1)[0]

    assert '<div class="actions">' in topbar
    assert '<button class="pass" data-status="pass">Pass</button>' in topbar
    assert '<div class="actions">' not in bottom


def test_review_image_header_uses_one_based_pdf_page_number():
    html = _html()

    assert "PDF page ${image.pdf_page_number ?? ''}" in html
    assert "Page ${image.source_page_index ?? ''}" not in html


def test_media_response_disables_browser_cache():
    handler = _FakeHandler()

    _send_bytes_response(handler, b"png-bytes", "image/png")

    assert handler.status == 200
    assert ("Cache-Control", "no-store, max-age=0") in handler.headers
    assert ("Content-Type", "image/png") in handler.headers
    assert handler.body == b"png-bytes"
