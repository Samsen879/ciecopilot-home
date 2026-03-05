"""
JS/Python parity test for decision-engine-v1.

Validates: Requirements 1 (AC14) — evaluate-v1 on fixed fixtures must achieve
field-level agreement rate >= 95% with Python reference results.

CI Environment Requirements:
  - Node.js >= 18 (ES module support required)
  - Python >= 3.10
  - Both runtimes must be available in the same CI job.
  - The Node fixture executor lives at:
      scripts/marking/run_js_decision_fixture_v1.js
  - Fixture data at:
      tests/marking/fixtures/parity_v1_fixtures.json
  - Reference results at:
      tests/marking/fixtures/parity_v1_reference.json
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest

# ── Paths ────────────────────────────────────────────────────────────────────

ROOT_DIR = Path(__file__).resolve().parents[2]

FIXTURE_PATH = ROOT_DIR / "tests" / "marking" / "fixtures" / "parity_v1_fixtures.json"
REFERENCE_PATH = ROOT_DIR / "tests" / "marking" / "fixtures" / "parity_v1_reference.json"
NODE_EXECUTOR = ROOT_DIR / "scripts" / "marking" / "run_js_decision_fixture_v1.js"

# ── Threshold ────────────────────────────────────────────────────────────────

FIELD_AGREEMENT_THRESHOLD = 0.95  # 95%

# Fields compared per decision
COMPARED_FIELDS = ("rubric_id", "mark_label", "awarded", "awarded_marks", "reason")

# ── Skip if Node is not available ────────────────────────────────────────────

NODE_BIN = shutil.which("node")


def _node_available() -> bool:
    """Check that node binary exists and is >= 18."""
    if NODE_BIN is None:
        return False
    try:
        result = subprocess.run(
            [NODE_BIN, "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        version_str = result.stdout.strip().lstrip("v")
        major = int(version_str.split(".")[0])
        return major >= 18
    except Exception:
        return False


requires_node = pytest.mark.skipif(
    not _node_available(),
    reason="Node.js >= 18 not available; skipping JS/Python parity test",
)

# ── Helpers ──────────────────────────────────────────────────────────────────


def run_js_executor(fixture_path: Path) -> dict:
    """Invoke the Node fixture executor and return parsed JSON output."""
    result = subprocess.run(
        [NODE_BIN, str(NODE_EXECUTOR), "--input", str(fixture_path)],
        capture_output=True,
        text=True,
        timeout=30,
        cwd=str(ROOT_DIR),
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Node executor failed (exit {result.returncode}):\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )
    return json.loads(result.stdout)


def load_reference() -> dict:
    """Load the Python-side reference results."""
    with open(REFERENCE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def compute_field_agreement(js_results: list[dict], ref_results: list[dict]) -> dict:
    """
    Compare JS decisions against reference decisions field-by-field.

    Returns:
        {
            "total_fields": int,
            "matched_fields": int,
            "agreement_rate": float,
            "mismatches": [ { fixture_id, decision_idx, field, js_val, ref_val } ]
        }
    """
    # Index reference by fixture id
    ref_by_id = {r["id"]: r["decisions"] for r in ref_results}

    total = 0
    matched = 0
    mismatches = []

    for js_item in js_results:
        fid = js_item["id"]
        js_decisions = js_item["decisions"]
        ref_decisions = ref_by_id.get(fid)

        if ref_decisions is None:
            # No reference for this fixture — count all fields as mismatches
            for di, jd in enumerate(js_decisions):
                for field in COMPARED_FIELDS:
                    total += 1
                    mismatches.append(
                        {
                            "fixture_id": fid,
                            "decision_idx": di,
                            "field": field,
                            "js_val": jd.get(field),
                            "ref_val": None,
                        }
                    )
            continue

        # Compare decision-by-decision (positional)
        max_len = max(len(js_decisions), len(ref_decisions))
        for di in range(max_len):
            jd = js_decisions[di] if di < len(js_decisions) else {}
            rd = ref_decisions[di] if di < len(ref_decisions) else {}

            for field in COMPARED_FIELDS:
                total += 1
                jv = jd.get(field)
                rv = rd.get(field)
                if jv == rv:
                    matched += 1
                else:
                    mismatches.append(
                        {
                            "fixture_id": fid,
                            "decision_idx": di,
                            "field": field,
                            "js_val": jv,
                            "ref_val": rv,
                        }
                    )

    rate = matched / total if total > 0 else 0.0
    return {
        "total_fields": total,
        "matched_fields": matched,
        "agreement_rate": rate,
        "mismatches": mismatches,
    }


# ── Tests ────────────────────────────────────────────────────────────────────


@requires_node
class TestJsPythonParity:
    """JS decision-engine-v1 vs Python reference parity tests."""

    def test_node_executor_runs_successfully(self):
        """Sanity: the Node executor exits 0 and returns valid JSON."""
        output = run_js_executor(FIXTURE_PATH)
        assert "results" in output
        assert isinstance(output["results"], list)
        assert len(output["results"]) > 0

    def test_fixture_ids_match_reference(self):
        """All fixture IDs in JS output match the reference set."""
        js_output = run_js_executor(FIXTURE_PATH)
        ref_data = load_reference()

        js_ids = {r["id"] for r in js_output["results"]}
        ref_ids = {r["id"] for r in ref_data["results"]}
        assert js_ids == ref_ids, f"ID mismatch: JS={js_ids - ref_ids}, Ref={ref_ids - js_ids}"

    def test_decision_count_matches_per_fixture(self):
        """Each fixture produces the same number of decisions in JS and reference."""
        js_output = run_js_executor(FIXTURE_PATH)
        ref_data = load_reference()

        ref_by_id = {r["id"]: r for r in ref_data["results"]}
        for js_item in js_output["results"]:
            fid = js_item["id"]
            ref_item = ref_by_id[fid]
            assert len(js_item["decisions"]) == len(ref_item["decisions"]), (
                f"Fixture '{fid}': JS has {len(js_item['decisions'])} decisions, "
                f"reference has {len(ref_item['decisions'])}"
            )

    def test_field_level_agreement_above_threshold(self):
        """
        Core parity assertion: field-level agreement rate >= 95%.

        Compares rubric_id, mark_label, awarded, awarded_marks, reason
        across all fixtures and decisions.
        """
        js_output = run_js_executor(FIXTURE_PATH)
        ref_data = load_reference()

        stats = compute_field_agreement(js_output["results"], ref_data["results"])

        # Diagnostic output on failure
        if stats["agreement_rate"] < FIELD_AGREEMENT_THRESHOLD:
            mismatch_summary = "\n".join(
                f"  [{m['fixture_id']}] decision[{m['decision_idx']}].{m['field']}: "
                f"JS={m['js_val']!r} vs Ref={m['ref_val']!r}"
                for m in stats["mismatches"][:20]  # cap output
            )
            pytest.fail(
                f"Field-level agreement {stats['agreement_rate']:.2%} "
                f"< {FIELD_AGREEMENT_THRESHOLD:.0%} threshold.\n"
                f"Matched {stats['matched_fields']}/{stats['total_fields']} fields.\n"
                f"Mismatches (first 20):\n{mismatch_summary}"
            )

        # Also assert explicitly for clear test output
        assert stats["agreement_rate"] >= FIELD_AGREEMENT_THRESHOLD, (
            f"Agreement {stats['agreement_rate']:.2%} below {FIELD_AGREEMENT_THRESHOLD:.0%}"
        )

    def test_all_decisions_have_required_fields(self):
        """Every JS decision contains all compared fields."""
        js_output = run_js_executor(FIXTURE_PATH)
        for item in js_output["results"]:
            for di, d in enumerate(item["decisions"]):
                for field in COMPARED_FIELDS:
                    assert field in d, (
                        f"Fixture '{item['id']}' decision[{di}] missing field '{field}'"
                    )

    def test_uncertain_reason_payload_is_stable_when_opted_in(self):
        """uncertain_reason appears with stable shape only when explicitly enabled."""
        with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
            fixture_data = json.load(f)
        fixture_data["fixtures"] = [
            {
                **item,
                "options": {
                    **(item.get("options") or {}),
                    "include_uncertain_reason": True,
                },
            }
            for item in fixture_data["fixtures"]
        ]

        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tmp:
            json.dump(fixture_data, tmp, ensure_ascii=True, indent=2)
            tmp_path = Path(tmp.name)

        try:
            js_output = run_js_executor(tmp_path)
            for item in js_output["results"]:
                for di, decision in enumerate(item["decisions"]):
                    assert "uncertain_reason" in decision
                    uncertain = decision["uncertain_reason"]
                    assert isinstance(uncertain, dict), (
                        f"Fixture '{item['id']}' decision[{di}] uncertain_reason must be an object"
                    )
                    assert set(uncertain.keys()) == {"is_uncertain", "code", "source_reason"}
                    assert uncertain["is_uncertain"] is (decision["awarded"] is False)
        finally:
            tmp_path.unlink(missing_ok=True)
