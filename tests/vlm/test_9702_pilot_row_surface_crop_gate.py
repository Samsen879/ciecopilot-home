import importlib.util
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts/vlm/build_9702_pilot_row_surface_crop_gate_v1.py"


def load_module():
    spec = importlib.util.spec_from_file_location("build_9702_pilot_row_surface_crop_gate_v1", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class Test9702PilotRowSurfaceCropGate(unittest.TestCase):
    def test_parses_9702_source_identity(self):
        module = load_module()

        meta = module.parse_9702_source_pdf_path("data/past-papers/9702Physics/paper5/9702_w24_qp_52.pdf")

        self.assertEqual(meta["subject_code"], "9702")
        self.assertEqual(meta["paper"], 5)
        self.assertEqual(meta["session_year"], "w24")
        self.assertEqual(meta["year"], 2024)
        self.assertEqual(meta["component"], "52")
        self.assertEqual(meta["variant"], 2)
        self.assertEqual(meta["source_pdf_stem"], "9702_w24_qp_52")

    def test_question_header_filter_rejects_measurement_noise(self):
        module = load_module()

        accepted = module.score_question_header_candidate(
            q_number=2,
            line_text="d 2 / cm2",
            first_token_x=67.0,
            first_token_y=206.7,
        )

        self.assertFalse(accepted["accepted"])
        self.assertEqual(accepted["reason"], "numeric_token_not_first")

    def test_question_number_token_parser_rejects_unicode_digit_like_noise(self):
        module = load_module()

        self.assertEqual(module.parse_question_number_token("12.)"), 12)
        self.assertIsNone(module.parse_question_number_token("9²"))

    def test_question_header_filter_accepts_sentence_after_number(self):
        module = load_module()

        accepted = module.score_question_header_candidate(
            q_number=5,
            line_text="5 A ball is projected vertically downwards with an initial velocity of 20 m s-1.",
            first_token_x=49.6,
            first_token_y=519.0,
        )

        self.assertTrue(accepted["accepted"])

    def test_question_header_filter_rejects_indented_continuation_measurement(self):
        module = load_module()

        accepted = module.score_question_header_candidate(
            q_number=20,
            line_text="20 m s-1 to 25 m s-1 in a time of 5.4 s.",
            first_token_x=70.86,
            first_token_y=285.24,
        )

        self.assertFalse(accepted["accepted"])
        self.assertEqual(accepted["reason"], "outside_header_margin")

    def test_duplicate_header_resolution_prefers_question_text_over_lone_figure_number(self):
        module = load_module()

        figure_number = {
            "q_number": 8,
            "line_text": "8",
            "score": module.score_question_header_candidate(
                q_number=8,
                line_text="8",
                first_token_x=70.565,
                first_token_y=286.04,
            )["score"],
        }
        question_header = {
            "q_number": 8,
            "line_text": "8 A horseshoe magnet is placed on a top pan balance.",
            "score": module.score_question_header_candidate(
                q_number=8,
                line_text="8 A horseshoe magnet is placed on a top pan balance.",
                first_token_x=49.606,
                first_token_y=60.131,
            )["score"],
        }

        decision = module.resolve_question_header_duplicate(figure_number, question_header)

        self.assertEqual(decision["action"], "replace")
        self.assertIs(decision["accepted"], question_header)
        self.assertEqual(decision["rejected"]["reason"], "lower_scoring_duplicate_question_header_candidate")

    def test_stable_identity_contains_required_fields(self):
        module = load_module()
        meta = module.parse_9702_source_pdf_path("data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf")

        row = module.build_surface_row(
            meta=meta,
            q_number=7,
            source_pdf_page_count=16,
            locator={
                "page_index": 4,
                "page_number": 5,
                "text": "7",
                "x": 49.6,
                "y": 62.5,
                "line_text": "7",
                "score": 32,
            },
            page_indices=[4],
            source_manifest_path="data/manifests/9702_pilot_structural_risk_page_chain_surface_v1.json",
            selection_reason="Paper 1 multiple-choice pages.",
        )

        self.assertEqual(row["subject_code"], "9702")
        self.assertEqual(row["paper"], 1)
        self.assertEqual(row["session_year"], "s25")
        self.assertEqual(row["component"], "11")
        self.assertEqual(row["source_pdf"], "data/past-papers/9702Physics/paper1/9702_s25_qp_11.pdf")
        self.assertEqual(row["storage_key"], "9702/s25_qp_11/questions/q07.png")
        self.assertEqual(row["q_number"], 7)
        self.assertEqual(row["page_range"]["start_page_number"], 5)
        self.assertEqual(row["locator_status"], "resolved")
        self.assertTrue(row["image_context_required"])
        self.assertFalse(row["production_ready_claimed"])


if __name__ == "__main__":
    unittest.main()
