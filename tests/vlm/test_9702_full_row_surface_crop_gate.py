import importlib.util
from pathlib import Path
import sys
import unittest

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts/vlm/build_9702_full_row_surface_crop_gate_v1.py"


def load_module():
    spec = importlib.util.spec_from_file_location("build_9702_full_row_surface_crop_gate_v1", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class Test9702FullRowSurfaceCropGate(unittest.TestCase):
    def test_builds_stable_9702_shard_strategy_by_paper_session_and_source_class(self):
        module = load_module()

        records = [
            {
                "repo_path": "data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf",
                "paper_number": 1,
                "session_code": "s",
                "source_posture": {"classification": "public_mirror_candidate_promoted_2026_06_02"},
                "status": "pass",
            },
            {
                "repo_path": "data/past-papers/9702Physics/paper1/9702_s24_qp_11.pdf",
                "paper_number": 1,
                "session_code": "s",
                "source_posture": {"classification": "historical_repo_source"},
                "status": "pass",
            },
            {
                "repo_path": "data/past-papers/9702Physics/paper4/9702_w24_qp_42.pdf",
                "paper_number": 4,
                "session_code": "w",
                "source_posture": {"classification": "historical_repo_source"},
                "status": "pass",
            },
        ]

        shards = module.build_shard_strategy(records)

        self.assertEqual(
            [shard["shard_id"] for shard in shards],
            [
                "9702_p1_s_historical_001",
                "9702_p1_s_promoted_public_001",
                "9702_p4_w_historical_001",
            ],
        )
        self.assertEqual(shards[0]["source_pdf_count"], 1)
        self.assertEqual(shards[1]["source_class"], "promoted_public")
        self.assertEqual(shards[2]["input_manifest_path"], "data/manifests/9702_p4_w_historical_001_input_v1.json")

    def test_full_gate_duplicate_identity_uses_storage_key_and_q_number(self):
        module = load_module()

        duplicates = module.find_duplicate_row_identities(
            [
                {"storage_key": "9702/s25_qp_11/questions/q01.png", "q_number": 1, "source_pdf": "a.pdf"},
                {"storage_key": "9702/s25_qp_11/questions/q01.png", "q_number": 1, "source_pdf": "a.pdf"},
                {"storage_key": "9702/s25_qp_11/questions/q02.png", "q_number": 2, "source_pdf": "a.pdf"},
            ],
        )

        self.assertEqual(
            duplicates,
            [{"storage_key": "9702/s25_qp_11/questions/q01.png", "q_number": 1, "count": 2}],
        )

    def test_image_nonblank_check_rejects_blank_png(self):
        module = load_module()

        with self.subTest("blank"):
            blank_path = ROOT / "tmp_blank_9702_full_gate_test.png"
            Image.new("RGB", (20, 20), "white").save(blank_path)
            try:
                self.assertFalse(module.image_is_nonblank(blank_path))
            finally:
                blank_path.unlink(missing_ok=True)

        with self.subTest("nonblank"):
            nonblank_path = ROOT / "tmp_nonblank_9702_full_gate_test.png"
            image = Image.new("RGB", (20, 20), "white")
            image.putpixel((10, 10), (0, 0, 0))
            image.save(nonblank_path)
            try:
                self.assertTrue(module.image_is_nonblank(nonblank_path))
            finally:
                nonblank_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
