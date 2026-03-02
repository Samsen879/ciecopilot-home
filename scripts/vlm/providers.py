"""
VLM provider abstraction for run_extraction_v0.py
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from pathlib import Path
import re

class RetryableError(Exception):
    """Error that should trigger retry with backoff."""
    pass

class VLMProvider(ABC):
    name: str = "base"
    model: str = "unknown"
    
    @abstractmethod
    def generate(self, image_path: Path) -> dict:
        pass

class MockProvider(VLMProvider):
    """Mock provider for testing - generates deterministic output."""
    name = "mock"
    model = "mock-v1"
    
    def generate(self, image_path: Path) -> dict:
        stem = image_path.stem
        q_number, subpart = None, None
        m = re.match(r"^q(\d{1,2})([a-z])?(?:_([ivx]+))?$", stem, re.I)
        if m:
            q_number = int(m.group(1))
            if m.group(2):
                subpart = m.group(2).lower()
                if m.group(3):
                    subpart += f"_{m.group(3).lower()}"
        return {
            "question_type": "calculation",
            "math_expressions_latex": [r"\int_0^1 x^2 dx"],
            "variables": ["x", "y"],
            "units": ["m", "s"],
            "diagram_elements": [],
            "q_number": q_number,
            "subpart": subpart,
            "answer_form": "exact",
            "confidence": 0.85,
            "summary": f"Mock extraction for {stem}",
        }

def get_provider(name: str, model: str = None) -> VLMProvider:
    """Get provider by name. Use 'mock' for testing, 'auto' falls back to mock."""
    if name in ("mock", "auto"):
        return MockProvider()
    raise ValueError(f"Unknown provider: {name}. Available: mock, auto")
