from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.build_9709_new_paper_shard_artifacts_v2 import (  # noqa: E402
    build_new_paper_shard_artifacts,
)


def _write_json(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _input_manifest() -> dict:
    rows = [
        {
            "storage_key": "9709/m25_qp_12/questions/q01.png",
            "syllabus_code": "9709",
            "year": 2025,
            "session": "m",
            "paper": 1,
            "variant": 2,
            "q_number": 1,
            "source_pdf": "data/past-papers/9709Mathematics/paper1/9709_m25_qp_12.pdf",
            "source_pdf_watermarked": False,
            "paper_family": "p1_p3",
            "group_key": "p1_m25_standard",
            "risk_tier": "core",
            "risk_tags": ["paper_1_or_3_core_classifier_covered"],
            "shard_id": "p1_m25_standard_001",
            "source": "9709_new_papers_2026_06_02_inventory_v1",
            "surface_evidence_status": "not_yet_extracted",
            "requires_review": True,
            "route_hint": "pdf_page_chain",
            "diagram_present": None,
            "formula_dense": None,
            "table_heavy": None,
        },
        {
            "storage_key": "9709/m25_qp_12/questions/q02.png",
            "syllabus_code": "9709",
            "year": 2025,
            "session": "m",
            "paper": 1,
            "variant": 2,
            "q_number": 2,
            "source_pdf": "data/past-papers/9709Mathematics/paper1/9709_m25_qp_12.pdf",
            "source_pdf_watermarked": False,
            "paper_family": "p1_p3",
            "group_key": "p1_m25_standard",
            "risk_tier": "core",
            "risk_tags": ["paper_1_or_3_core_classifier_covered"],
            "shard_id": "p1_m25_standard_001",
            "source": "9709_new_papers_2026_06_02_inventory_v1",
            "surface_evidence_status": "not_yet_extracted",
            "requires_review": True,
            "route_hint": "pdf_page_chain",
            "diagram_present": None,
            "formula_dense": None,
            "table_heavy": None,
        },
    ]
    return {
        "schema_version": "9709_new_papers_2026_06_03_shard_input_v2",
        "manifest_id": "9709_new_papers_2026_06_03_manifest_v2_p1_m25_standard_001",
        "subject_code": "9709",
        "generated_on": "2026-06-03",
        "source_manifest_id": "9709_new_papers_2026_06_03_manifest_v2",
        "shard_id": "p1_m25_standard_001",
        "group_key": "p1_m25_standard",
        "risk_tier": "core",
        "item_count": len(rows),
        "pdf_count": 1,
        "pdf_paths": ["data/past-papers/9709Mathematics/paper1/9709_m25_qp_12.pdf"],
        "paper_set": [1],
        "session_year_set": ["m25"],
        "risk_tags": ["paper_1_or_3_core_classifier_covered"],
        "items": rows,
    }


def _crop_manifest(tmp_path: Path) -> dict:
    items = []
    for q_number in (1, 2):
        crop_path = (
            tmp_path
            / "tmp"
            / "pdf-page-chain"
            / "new-papers-pre-shard-v2"
            / "p1_m25_standard_001"
            / "question-crops"
            / "9709_m25_qp_12"
            / f"q{q_number:02d}"
            / f"q{q_number:02d}_page_{q_number + 1:03d}.png"
        )
        render_path = (
            tmp_path
            / "tmp"
            / "pdf-page-chain"
            / "new-papers-pre-shard-v2"
            / "p1_m25_standard_001"
            / "renders"
            / "9709_m25_qp_12"
            / f"9709_m25_qp_12_page_{q_number + 1:03d}.png"
        )
        crop_path.parent.mkdir(parents=True, exist_ok=True)
        render_path.parent.mkdir(parents=True, exist_ok=True)
        crop_path.write_bytes(b"fake-png")
        render_path.write_bytes(b"fake-render")
        items.append(
            {
                **_input_manifest()["items"][q_number - 1],
                "input_manifest_path": "data/manifests/9709_p1_m25_standard_001_input_v2.json",
                "rendered_pdf_page_paths": [render_path.relative_to(tmp_path).as_posix()],
                "crop_paths": [crop_path.relative_to(tmp_path).as_posix()],
                "page_indices": [q_number],
                "page_range": {"start_page_index": q_number, "end_page_index": q_number},
                "crop_records": [
                    {
                        "page_index": q_number,
                        "rendered_pdf_page_path": render_path.relative_to(tmp_path).as_posix(),
                        "crop_path": crop_path.relative_to(tmp_path).as_posix(),
                    }
                ],
                "crop_status": "complete",
                "local_extraction_crop_method": "pymupdf_text_words_question_band_v1",
                "visual_review_required": True,
                "visual_review_reason": "not_vlm_reviewed_local_only",
                "mechanical_validation": {
                    "crop_files_exist": True,
                    "crop_images_non_empty": True,
                    "crop_dimensions_reasonable": True,
                    "referenced_rendered_pages_exist": True,
                },
            }
        )
    return {
        "schema_version": "9709_new_papers_pre_shard_crop_manifest_v2",
        "manifest_id": "9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2",
        "item_count": len(items),
        "items": items,
    }


class BuildNewPaperShardArtifactsV2Test(unittest.TestCase):
    def test_builds_pending_surface_from_corrected_v2_crops_only(self):
        with self.subTest("v2 pending surface"):
            tmp_dir = tempfile.TemporaryDirectory()
            self.addCleanup(tmp_dir.cleanup)
            tmp_path = Path(tmp_dir.name)
            manifest_path = _write_json(tmp_path / "data/manifests/9709_p1_m25_standard_001_input_v2.json", _input_manifest())
            crop_manifest_path = _write_json(
                tmp_path / "data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json",
                _crop_manifest(tmp_path),
            )

            result = build_new_paper_shard_artifacts(
                input_manifest_path=manifest_path,
                crop_manifest_path=crop_manifest_path,
                workspace_root=tmp_path,
                generated_on="2026-06-03",
            )

            self.assertEqual(result["surface_manifest"]["schema_version"], "9709_new_paper_page_chain_surface_v2")
            self.assertEqual(result["surface_manifest"]["item_count"], 2)
            self.assertEqual(result["summary"]["external_vlm_api_calls"], 0)
            self.assertEqual(result["summary"]["visual_review_status"], "pending")
            first = result["surface_manifest"]["items"][0]
            self.assertEqual(first["surface_evidence_status"], "pre_shard_crops_ready_pending_visual_review")
            self.assertEqual(first["visual_review_status"], "pending")
            self.assertIsNone(first["diagram_present"])
            self.assertTrue(first["requires_review"])
            self.assertEqual(first["review_crop_paths"][0], first["crop_paths"][0])

    def test_applies_local_visual_dispositions_and_builds_authority_inputs(self):
        with self.subTest("accepted local visual"):
            tmp_dir = tempfile.TemporaryDirectory()
            self.addCleanup(tmp_dir.cleanup)
            tmp_path = Path(tmp_dir.name)
            manifest_path = _write_json(tmp_path / "data/manifests/9709_p1_m25_standard_001_input_v2.json", _input_manifest())
            crop_manifest_path = _write_json(
                tmp_path / "data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json",
                _crop_manifest(tmp_path),
            )
            visual_dispositions_path = _write_json(
                tmp_path / "docs/reports/visual.json",
                {
                    "schema_version": "9709_new_paper_local_visual_dispositions_v2",
                    "shard_id": "p1_m25_standard_001",
                    "items": [
                        {
                            "storage_key": "9709/m25_qp_12/questions/q01.png",
                            "disposition": "accepted",
                            "diagram_present": False,
                            "formula_dense": True,
                            "table_heavy": False,
                            "route_hint": "ocr_lane",
                            "visual_topic_guess": "9709.p1.quadratics",
                            "authority_topic_path": "9709.p1.quadratics",
                            "question_text": "1 Solve a quadratic equation.",
                            "reviewed_by": "codex_local_visual_review",
                            "visual_checks": {"question_boundary_accepted": True},
                        },
                        {
                            "storage_key": "9709/m25_qp_12/questions/q02.png",
                            "disposition": "accepted",
                            "diagram_present": False,
                            "formula_dense": False,
                            "table_heavy": False,
                            "route_hint": "ocr_lane",
                            "visual_topic_guess": "9709.p1.functions",
                            "authority_topic_path": "9709.p1.functions",
                            "question_text": "2 Transform a function graph.",
                            "reviewed_by": "codex_local_visual_review",
                            "visual_checks": {"question_boundary_accepted": True},
                        },
                    ],
                },
            )
            curriculum_seed_path = _write_json(
                tmp_path / "data/curriculum/seed.json",
                {
                    "syllabus_code": "9709",
                    "version_tag": "2025-2027_v1",
                    "nodes": [
                        {"syllabus_code": "9709", "version_tag": "2025-2027_v1", "topic_path": "9709.p1.quadratics"},
                        {"syllabus_code": "9709", "version_tag": "2025-2027_v1", "topic_path": "9709.p1.functions"},
                    ],
                },
            )

            result = build_new_paper_shard_artifacts(
                input_manifest_path=manifest_path,
                crop_manifest_path=crop_manifest_path,
                visual_dispositions_path=visual_dispositions_path,
                curriculum_seed_path=curriculum_seed_path,
                workspace_root=tmp_path,
                generated_on="2026-06-03",
            )

            self.assertEqual(result["summary"]["visual_review_status"], "accepted")
            self.assertEqual(result["summary"]["authority_sidecar_items"], 2)
            self.assertEqual(result["surface_manifest"]["items"][0]["surface_evidence_status"], "local_visual_review_accepted")
            self.assertFalse(result["surface_manifest"]["items"][0]["requires_review"])
            self.assertEqual(result["lane_results"]["results"][0]["input_asset_id"], "9709/m25_qp_12/questions/q01.png")
            self.assertEqual(
                result["authority_sidecar"]["items"][0]["authority_input_pack"]["canonical_primary_topic_path"],
                "9709.p1.quadratics",
            )

    def test_rejects_old_v1_input_manifest(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        tmp_path = Path(tmp_dir.name)
        old_manifest = _input_manifest()
        old_manifest["schema_version"] = "9709_new_papers_2026_06_02_shard_input_v1"
        manifest_path = _write_json(tmp_path / "data/manifests/9709_p1_m25_standard_001_input_v1.json", old_manifest)
        crop_manifest_path = _write_json(
            tmp_path / "data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json",
            _crop_manifest(tmp_path),
        )

        with self.assertRaisesRegex(ValueError, "corrected v2"):
            build_new_paper_shard_artifacts(
                input_manifest_path=manifest_path,
                crop_manifest_path=crop_manifest_path,
                workspace_root=tmp_path,
            )


if __name__ == "__main__":
    unittest.main()
