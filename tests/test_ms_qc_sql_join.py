"""Regression tests for QC sampler SQL joins.

Ensures joins between rubric_points and vlm_ms_jobs include version dimensions
to avoid cross-version row inflation in QC metrics.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.ms import qc_sampler


def test_stratified_sample_join_includes_version_dimensions():
    sql = qc_sampler._STRATIFIED_SAMPLE_SQL
    assert "rp.extractor_version = j.extractor_version" in sql
    assert "rp.provider          = j.provider" in sql
    assert "rp.model             = j.model" in sql
    assert "rp.prompt_version    = j.prompt_version" in sql


def test_strata_distribution_join_includes_version_dimensions():
    sql = qc_sampler._STRATA_DISTRIBUTION_SQL
    assert "rp.extractor_version = j.extractor_version" in sql
    assert "rp.provider          = j.provider" in sql
    assert "rp.model             = j.model" in sql
    assert "rp.prompt_version    = j.prompt_version" in sql
