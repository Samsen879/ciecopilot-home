from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.vlm.qc_wave_a_shard_verdict import main  # noqa: E402


def _manifest():
    return {
        "manifest_id": "9709_question_search_expansion_wave_a_v1",
        "items": [
            {
                "storage_key": "9709/s17_qp_11/questions/q03.png",
                "syllabus_code": "9709",
                "year": 2017,
                "session": "s",
                "paper": 1,
                "variant": 1,
                "q_number": 3,
                "primary_topic_path": "9709.p1.trigonometry",
                "difficulty_band": "clean",
                "descriptor_required": True,
                "gate_critical": False,
                "shard_id": "shard_1",
            },
            {
                "storage_key": "9709/s16_qp_32/questions/q03.png",
                "syllabus_code": "9709",
                "year": 2016,
                "session": "s",
                "paper": 3,
                "variant": 2,
                "q_number": 3,
                "primary_topic_path": "9709.p3.integration",
                "difficulty_band": "medium",
                "descriptor_required": True,
                "gate_critical": False,
                "shard_id": "shard_1",
            },
        ],
    }


def _lane_results(*, include_failure: bool = False):
    rows = [
        {
            "input_asset_id": "9709/s17_qp_11/questions/q03.png",
            "route": "ocr_lane",
            "lane": "ocr",
            "failure_reason": None,
            "output": {
                "summary": "Prove a trigonometric identity and solve the equation.",
                "warnings": [],
                "evidence": [],
            },
            "wave1": {
                "route": "ocr_lane",
                "lane": "ocr",
            },
        },
        {
            "input_asset_id": "9709/s16_qp_32/questions/q03.png",
            "route": "ocr_lane",
            "lane": "ocr",
            "failure_reason": "provider timeout" if include_failure else None,
            "output": {
                "summary": "Evaluate the definite integral exactly.",
                "warnings": [],
                "evidence": [],
            },
            "wave1": {
                "route": "ocr_lane",
                "lane": "ocr",
            },
        },
    ]
    return rows


def _gate():
    return {
        "gate": {
            "pass": True,
            "checks": [],
        }
    }


def _projection_audit():
    return {
        "pass": True,
        "summary": {
            "target_row_count": 2,
            "duplicate_projection_rows": 0,
            "current_shard_projection_completeness": 1,
            "current_shard_queryability": 1,
        },
        "failures": [],
    }


def _full_review(*, acceptance: float = 1.0):
    accepted = int(round(10 * acceptance))
    records = []
    for index in range(10):
        if index < accepted:
            records.append(
                {
                    "storage_key": f"accepted-{index}",
                    "review": {
                        "descriptor_readiness": "descriptor_ready",
                        "route_verdict": "appropriate",
                        "review_bucket_verdict": "correct",
                    },
                }
            )
        else:
            records.append(
                {
                    "storage_key": f"rejected-{index}",
                    "review": {
                        "descriptor_readiness": "review_bucket",
                        "route_verdict": "under_conservative",
                        "review_bucket_verdict": "incorrect",
                    },
                }
            )
    return {
        "mode": "wave1_lane",
        "records": records,
    }


def _thresholds():
    return {
        "contract_id": "9709_wave_a_thresholds_v1",
        "provider_failure_max": 0,
        "baseline_gate_pass_required": True,
        "full_review_min_acceptance": 0.9,
        "unexpected_review_lane_max": {
            "clean": 0,
            "medium": 0,
        },
        "projection_required_fields": [
            "question_id",
            "source_kind",
            "subject_code",
            "year",
            "session",
            "paper_number",
            "variant",
            "q_number",
            "summary",
            "search_text",
        ],
        "current_shard_projection_completeness_required": 1,
        "current_shard_queryability_required": 1,
        "duplicate_projection_rows_max": 0,
        "gate_critical_full_review_required": True,
        "route_hint_match_required": {
            "clean": True,
            "medium": True,
        },
        "review_lane_allowlist_required": True,
        "review_lane_allowlist_source": "manifest",
        "closure_scope_mode_required": "lane_results",
    }


class WaveAShardVerdictTests(unittest.TestCase):
    def _write_json(self, directory: Path, name: str, payload) -> Path:
        path = directory / name
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return path

    def test_main_writes_pass_verdict_when_thresholds_are_met(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            output_json = tmp_path / "verdict.json"
            output_md = tmp_path / "verdict.md"

            exit_code = main(
                [
                    "--manifest",
                    str(self._write_json(tmp_path, "manifest.json", _manifest())),
                    "--shard-id",
                    "shard_1",
                    "--lane-results-json",
                    str(self._write_json(tmp_path, "lane-results.json", _lane_results())),
                    "--gate-json",
                    str(self._write_json(tmp_path, "gate.json", _gate())),
                    "--projection-audit-json",
                    str(self._write_json(tmp_path, "projection-audit.json", _projection_audit())),
                    "--full-review-json",
                    str(self._write_json(tmp_path, "full-review.json", _full_review())),
                    "--thresholds-json",
                    str(self._write_json(tmp_path, "thresholds.json", _thresholds())),
                    "--output-json",
                    str(output_json),
                    "--output-md",
                    str(output_md),
                ]
            )

            self.assertEqual(exit_code, 0)
            verdict = json.loads(output_json.read_text(encoding="utf-8"))
            self.assertEqual(verdict["status"], "pass")
            self.assertTrue(verdict["pass"])
            self.assertEqual(verdict["summary"]["provider_failures"], 0)
            self.assertGreaterEqual(verdict["summary"]["full_review_acceptance"], 0.9)
            self.assertIn("Execution Fingerprint", output_md.read_text(encoding="utf-8"))

    def test_main_returns_non_zero_when_threshold_is_breached(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            output_json = tmp_path / "verdict.json"
            output_md = tmp_path / "verdict.md"

            exit_code = main(
                [
                    "--manifest",
                    str(self._write_json(tmp_path, "manifest.json", _manifest())),
                    "--shard-id",
                    "shard_1",
                    "--lane-results-json",
                    str(self._write_json(tmp_path, "lane-results.json", _lane_results(include_failure=True))),
                    "--gate-json",
                    str(self._write_json(tmp_path, "gate.json", _gate())),
                    "--projection-audit-json",
                    str(self._write_json(tmp_path, "projection-audit.json", _projection_audit())),
                    "--full-review-json",
                    str(self._write_json(tmp_path, "full-review.json", _full_review(acceptance=0.8))),
                    "--thresholds-json",
                    str(self._write_json(tmp_path, "thresholds.json", _thresholds())),
                    "--output-json",
                    str(output_json),
                    "--output-md",
                    str(output_md),
                ]
            )

            self.assertEqual(exit_code, 1)
            verdict = json.loads(output_json.read_text(encoding="utf-8"))
            self.assertEqual(verdict["status"], "fail")
            failure_codes = {failure["code"] for failure in verdict["failures"]}
            self.assertIn("provider_failures_exceeded", failure_codes)
            self.assertIn("full_review_acceptance_below_threshold", failure_codes)
            self.assertIn("fail", output_md.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
