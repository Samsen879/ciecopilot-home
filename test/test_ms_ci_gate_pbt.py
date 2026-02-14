"""Property-based test for B1 CI Gate blocking behavior.

# Feature: ms-rubric-extraction, Property 36: B1 CI Gate 阻断行为

For ANY gate run, whenever tests fail, migration fails, contract fails,
or QC returns release_blocked, the CI gate result MUST be 'failed'.
Conversely, the gate passes ONLY when ALL checks pass.

**Validates: Requirements 9.3**
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms.b1_ci_gate import run_gate


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Generate random check results for each gate check
_test_result = st.fixed_dictionaries({
    "passed": st.booleans(),
    "exit_code": st.integers(min_value=-1, max_value=4),
    "output": st.text(min_size=0, max_size=50),
})

_qc_result = st.fixed_dictionaries({
    "passed": st.booleans(),
    "skipped": st.booleans(),
    "output": st.text(min_size=0, max_size=50),
})

_migration_result = st.fixed_dictionaries({
    "passed": st.booleans(),
    "output": st.text(min_size=0, max_size=50),
})

_contract_result = st.fixed_dictionaries({
    "passed": st.booleans(),
    "output": st.text(min_size=0, max_size=50),
})


# ---------------------------------------------------------------------------
# Property 36: B1 CI Gate 阻断行为
# ---------------------------------------------------------------------------


class TestProperty36CIGateBlocking:
    """
    **Property 36**: For ANY combination of check results, the gate
    MUST fail if any single check fails. The gate passes ONLY when
    all checks pass.

    **Validates: Requirements 9.3**
    """

    @given(
        test_res=_test_result,
        qc_res=_qc_result,
        migration_res=_migration_result,
        contract_res=_contract_result,
    )
    @settings(max_examples=100, deadline=None)
    def test_gate_fails_when_any_check_fails(
        self,
        test_res: dict,
        qc_res: dict,
        migration_res: dict,
        contract_res: dict,
    ):
        """Gate result is 'failed' iff any check has passed=False."""
        all_pass = (
            test_res["passed"]
            and migration_res["passed"]
            and contract_res["passed"]
            and qc_res["passed"]
        )

        with (
            patch("scripts.ms.b1_ci_gate.run_b1_tests", return_value=test_res),
            patch("scripts.ms.b1_ci_gate.run_migration_check", return_value=migration_res),
            patch("scripts.ms.b1_ci_gate.run_contract_check", return_value=contract_res),
            patch("scripts.ms.b1_ci_gate.run_qc_check", return_value=qc_res),
        ):
            exit_code = run_gate()

        if all_pass:
            assert exit_code == 0, (
                f"Gate should PASS when all checks pass, got exit_code={exit_code}"
            )
        else:
            assert exit_code == 1, (
                f"Gate should FAIL when any check fails: "
                f"tests={test_res['passed']}, migration={migration_res['passed']}, "
                f"contract={contract_res['passed']}, qc={qc_res['passed']}, "
                f"got exit_code={exit_code}"
            )

    @given(
        migration_res=_migration_result,
        contract_res=_contract_result,
        qc_res=_qc_result,
    )
    @settings(max_examples=100, deadline=None)
    def test_test_failure_always_blocks(
        self,
        migration_res: dict,
        contract_res: dict,
        qc_res: dict,
    ):
        """Gate MUST fail when tests fail, regardless of other checks."""
        test_res = {"passed": False, "exit_code": 1, "output": "tests failed"}

        with (
            patch("scripts.ms.b1_ci_gate.run_b1_tests", return_value=test_res),
            patch("scripts.ms.b1_ci_gate.run_migration_check", return_value=migration_res),
            patch("scripts.ms.b1_ci_gate.run_contract_check", return_value=contract_res),
            patch("scripts.ms.b1_ci_gate.run_qc_check", return_value=qc_res),
        ):
            exit_code = run_gate()

        assert exit_code == 1, "Gate must fail when tests fail"

    @given(
        test_res=_test_result,
        contract_res=_contract_result,
        migration_res=_migration_result,
    )
    @settings(max_examples=100, deadline=None)
    def test_qc_blocked_always_blocks(
        self,
        test_res: dict,
        contract_res: dict,
        migration_res: dict,
    ):
        """Gate MUST fail when QC is release_blocked, regardless of other checks."""
        qc_res = {"passed": False, "skipped": False, "output": "release_blocked"}

        with (
            patch("scripts.ms.b1_ci_gate.run_b1_tests", return_value=test_res),
            patch("scripts.ms.b1_ci_gate.run_migration_check", return_value=migration_res),
            patch("scripts.ms.b1_ci_gate.run_contract_check", return_value=contract_res),
            patch("scripts.ms.b1_ci_gate.run_qc_check", return_value=qc_res),
        ):
            exit_code = run_gate()

        assert exit_code == 1, "Gate must fail when QC is release_blocked"

    @given(
        test_res=_test_result,
        contract_res=_contract_result,
        qc_res=_qc_result,
    )
    @settings(max_examples=100, deadline=None)
    def test_migration_failure_always_blocks(
        self,
        test_res: dict,
        contract_res: dict,
        qc_res: dict,
    ):
        """Gate MUST fail when migration check fails, regardless of other checks."""
        migration_res = {"passed": False, "output": "migration error"}

        with (
            patch("scripts.ms.b1_ci_gate.run_b1_tests", return_value=test_res),
            patch("scripts.ms.b1_ci_gate.run_migration_check", return_value=migration_res),
            patch("scripts.ms.b1_ci_gate.run_contract_check", return_value=contract_res),
            patch("scripts.ms.b1_ci_gate.run_qc_check", return_value=qc_res),
        ):
            exit_code = run_gate()

        assert exit_code == 1, "Gate must fail when migration fails"

    @given(
        test_res=_test_result,
        migration_res=_migration_result,
        qc_res=_qc_result,
    )
    @settings(max_examples=100, deadline=None)
    def test_contract_failure_always_blocks(
        self,
        test_res: dict,
        migration_res: dict,
        qc_res: dict,
    ):
        """Gate MUST fail when contract check fails, regardless of other checks."""
        contract_res = {"passed": False, "output": "contract failures"}

        with (
            patch("scripts.ms.b1_ci_gate.run_b1_tests", return_value=test_res),
            patch("scripts.ms.b1_ci_gate.run_migration_check", return_value=migration_res),
            patch("scripts.ms.b1_ci_gate.run_contract_check", return_value=contract_res),
            patch("scripts.ms.b1_ci_gate.run_qc_check", return_value=qc_res),
        ):
            exit_code = run_gate()

        assert exit_code == 1, "Gate must fail when contract check fails"
