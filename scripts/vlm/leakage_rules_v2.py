"""Extended leakage detection rules v2 (independent module, does not modify contracts.py)."""
from __future__ import annotations
import re
from dataclasses import dataclass
from typing import Literal

# Priority levels for rules
Priority = Literal["P0", "P1", "P2"]

# Risk types
RiskType = Literal["CR-MS", "CR-ER", "CR-CN", "AN-STM", "AN-DER", "AN-NUM", "AN-MP", "AN-PRF", "PI-CON", "PI-STU"]

@dataclass
class RuleDefinition:
    """Rule metadata for documentation and prioritization."""
    pattern: str
    flag_name: str
    priority: Priority
    risk_type: RiskType
    description: str

# 15 extended detection rules from detection_rules_v2.md
EXTENDED_RULES: list[RuleDefinition] = [
    # P0 - Critical priority
    RuleDefinition(
        pattern=r"\b(examiner'?s?\s+report|chief\s+examiner)\b",
        flag_name="examiner_report",
        priority="P0",
        risk_type="CR-ER",
        description="Detect examiner report references"
    ),
    RuleDefinition(
        pattern=r"\b(marking\s+scheme|mark\s+allocation)\b|\bMS\s*[:=]",
        flag_name="marking_scheme_variant",
        priority="P0",
        risk_type="CR-MS",
        description="Detect marking scheme variants and abbreviations"
    ),
    RuleDefinition(
        pattern=r"\b(award|give|allow)\s+\d+\s*marks?\b",
        flag_name="award_mark",
        priority="P0",
        risk_type="AN-MP",
        description="Detect mark awarding instructions from mark schemes"
    ),
    # P1 - High priority
    RuleDefinition(
        pattern=r"\b(the\s+)?(result|solution|value)\s+is\b",
        flag_name="answer_variant",
        priority="P1",
        risk_type="AN-STM",
        description="Detect answer statement variants"
    ),
    RuleDefinition(
        pattern=r"\b(we\s+)?(get|obtain|find|have)\s+[a-z]\s*=",
        flag_name="answer_obtain",
        priority="P1",
        risk_type="AN-DER",
        description="Detect derivation conclusions with get/obtain/find"
    ),
    RuleDefinition(
        pattern=r"=\s*-?\d+\.?\d*\s*(m/s|m/s²|kg/m³|N/m|J/mol|kJ|MJ|cm|mm|km|g|mg|kPa|MPa|mA|kV|mV|kHz|MHz|GHz)\b",
        flag_name="numeric_answer_extended",
        priority="P1",
        risk_type="AN-NUM",
        description="Detect numeric answers with compound/prefixed units"
    ),
    RuleDefinition(
        pattern=r"\b(so|thus|therefore|hence)\s+[a-z]\s*=\s*-\d",
        flag_name="negative_answer",
        priority="P1",
        risk_type="AN-DER",
        description="Detect negative number answers"
    ),
    RuleDefinition(
        pattern=r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        flag_name="pii_email",
        priority="P1",
        risk_type="PI-CON",
        description="Detect email addresses (PII)"
    ),
    RuleDefinition(
        pattern=r"\b(candidate|centre)\s*(number|no\.?|code)?\s*[:=]?\s*\d{4,}",
        flag_name="pii_candidate",
        priority="P1",
        risk_type="PI-STU",
        description="Detect candidate/centre numbers (PII)"
    ),
    RuleDefinition(
        pattern=r"(答案|结果|解)[是为：:]\s*\S+",
        flag_name="chinese_answer",
        priority="P1",
        risk_type="AN-STM",
        description="Detect Chinese answer statements"
    ),
    RuleDefinition(
        pattern=r"\b(so|thus|therefore|hence)\s+[a-z]\s*=\s*\d+/\d+",
        flag_name="fraction_answer",
        priority="P1",
        risk_type="AN-DER",
        description="Detect fraction form answers"
    ),
    # P2 - Medium priority
    RuleDefinition(
        pattern=r"\b(hence\s+proved|QED|as\s+required|which\s+completes\s+the\s+proof)\b",
        flag_name="proof_conclusion",
        priority="P2",
        risk_type="AN-PRF",
        description="Detect proof conclusions"
    ),
    RuleDefinition(
        pattern=r"©|copyright|\bCIE\b|Cambridge\s+(Assessment|International)",
        flag_name="copyright_notice",
        priority="P2",
        risk_type="CR-CN",
        description="Detect copyright notices"
    ),
    RuleDefinition(
        pattern=r"\\frac\{[^}]+\}\{[^}]+\}\s*=|=\s*\\frac\{[^}]+\}\{[^}]+\}",
        flag_name="latex_answer",
        priority="P2",
        risk_type="AN-NUM",
        description="Detect LaTeX fraction answers"
    ),
    RuleDefinition(
        pattern=r"\bsubstitut(e|ing)\s+.*=\s*\d",
        flag_name="substituting_value",
        priority="P2",
        risk_type="AN-DER",
        description="Detect substitution calculation steps"
    ),
]

# Compile patterns for performance
LEAKAGE_PATTERNS_V2: list[tuple[re.Pattern, str, Priority, RiskType]] = [
    (re.compile(r.pattern, re.IGNORECASE), r.flag_name, r.priority, r.risk_type)
    for r in EXTENDED_RULES
]

def extended_leakage_guard(data: dict, priority_filter: Priority | None = None) -> tuple[dict, dict]:
    """
    Extended leakage detection using v2 rules.
    
    Compatible with contracts.leakage_guard() return format.
    
    Args:
        data: QuestionDescriptionV0 dict
        priority_filter: Optional filter to only check rules of specific priority
        
    Returns:
        (data, leakage_flags) - data may have status='blocked' and errors updated
    """
    flags: dict[str, bool | int] = {}
    errors = list(data.get("errors", []))
    blocked = False
    skip = {"storage_key", "sha256", "status", "errors", "leakage_flags", "raw_json"}
    
    def check_text(text: str, field_name: str) -> bool:
        nonlocal blocked
        triggered = False
        for pattern, flag_name, priority, _ in LEAKAGE_PATTERNS_V2:
            if priority_filter and priority != priority_filter:
                continue
            if pattern.search(text):
                flags[f"{field_name}_{flag_name}"] = True
                errors.append(f"{field_name}: {flag_name}")
                triggered = True
        return triggered
    
    for key, val in data.items():
        if key in skip:
            continue
        if isinstance(val, str) and val:
            if check_text(val, key):
                blocked = True
        elif isinstance(val, list):
            for i, item in enumerate(val):
                if isinstance(item, str) and item:
                    if check_text(item, f"{key}[{i}]"):
                        blocked = True
    
    if blocked:
        data["status"] = "blocked"
        data["errors"] = errors
    
    return data, flags

def get_rules_by_priority(priority: Priority) -> list[RuleDefinition]:
    """Get all rules of a specific priority level."""
    return [r for r in EXTENDED_RULES if r.priority == priority]

def get_all_patterns() -> list[tuple[str, str]]:
    """Get all patterns in (pattern, flag_name) format for compatibility."""
    return [(r.pattern, r.flag_name) for r in EXTENDED_RULES]


# === Unit Tests ===
if __name__ == "__main__":
    import sys
    
    def test_rule(pattern: str, flag_name: str, positive: list[str], negative: list[str]) -> bool:
        """Test a single rule with positive and negative cases."""
        compiled = re.compile(pattern, re.IGNORECASE)
        passed = True
        
        for text in positive:
            if not compiled.search(text):
                print(f"  FAIL: {flag_name} should match: {text!r}")
                passed = False
        
        for text in negative:
            if compiled.search(text):
                print(f"  FAIL: {flag_name} should NOT match: {text!r}")
                passed = False
        
        return passed
    
    # Test cases for each rule
    TEST_CASES = {
        "examiner_report": {
            "positive": ["examiner's report", "Examiner Report", "chief examiner"],
            "negative": ["examine the result", "reporter"],
        },
        "marking_scheme_variant": {
            "positive": ["marking scheme", "MS:", "MS=", "mark allocation"],
            "negative": ["mark this", "scheme"],
        },
        "award_mark": {
            "positive": ["award 2 marks", "give 1 mark", "allow 3 marks"],
            "negative": ["2 marks", "award ceremony"],
        },
        "answer_variant": {
            "positive": ["the result is", "solution is", "the value is"],
            "negative": ["result in", "solution for"],
        },
        "answer_obtain": {
            "positive": ["we get x =", "obtain y =", "find z =", "have a ="],
            "negative": ["get the", "obtain a copy"],
        },
        "numeric_answer_extended": {
            "positive": ["= 9.8 m/s", "= -5 kJ", "= 100 cm"],
            "negative": ["9.8 m/s", "speed is"],
        },
        "negative_answer": {
            "positive": ["so x = -5", "therefore y = -10"],
            "negative": ["so x = 5", "therefore y = 10"],
        },
        "pii_email": {
            "positive": ["test@example.com", "user.name@domain.co.uk"],
            "negative": ["test@", "@example", "email"],
        },
        "pii_candidate": {
            "positive": ["candidate number: 12345", "centre code 9999"],
            "negative": ["candidate", "centre"],
        },
        "chinese_answer": {
            "positive": ["答案是 42", "结果为：5", "解：x=3"],
            "negative": ["答案", "结果"],
        },
        "fraction_answer": {
            "positive": ["so x = 1/2", "therefore y = 3/4"],
            "negative": ["so x = 0.5", "1/2"],
        },
        "proof_conclusion": {
            "positive": ["hence proved", "QED", "as required"],
            "negative": ["hence", "proved"],
        },
        "copyright_notice": {
            "positive": ["©", "copyright", "CIE", "Cambridge Assessment"],
            "negative": ["copy", "right"],
        },
        "latex_answer": {
            "positive": [r"\frac{1}{2} =", r"= \frac{3}{4}"],
            "negative": [r"\frac{x}{y}", "fraction"],
        },
        "substituting_value": {
            "positive": ["substitute x = 5", "substituting y = 3"],
            "negative": ["substitute", "substitution"],
        },
    }
    
    print("Running leakage_rules_v2 unit tests...\n")
    all_passed = True
    
    for rule in EXTENDED_RULES:
        cases = TEST_CASES.get(rule.flag_name, {"positive": [], "negative": []})
        print(f"Testing {rule.flag_name} ({rule.priority})...")
        if test_rule(rule.pattern, rule.flag_name, cases["positive"], cases["negative"]):
            print(f"  PASS")
        else:
            all_passed = False
    
    # Test extended_leakage_guard function
    print("\nTesting extended_leakage_guard()...")
    test_data = {
        "storage_key": "test.png",
        "sha256": "abc123",
        "summary": "The result is 42, according to examiner's report",
        "status": "ok",
        "errors": [],
    }
    result_data, result_flags = extended_leakage_guard(test_data.copy())
    
    if result_data["status"] == "blocked":
        print("  PASS: status correctly set to blocked")
    else:
        print("  FAIL: status should be blocked")
        all_passed = False
    
    if "summary_answer_variant" in result_flags and "summary_examiner_report" in result_flags:
        print("  PASS: correct flags detected")
    else:
        print(f"  FAIL: expected flags not found, got: {result_flags}")
        all_passed = False
    
    # Test priority filter
    print("\nTesting priority filter...")
    test_data2 = {"summary": "award 2 marks", "status": "ok", "errors": [], "storage_key": "x", "sha256": "y"}
    _, flags_p0 = extended_leakage_guard(test_data2.copy(), priority_filter="P0")
    _, flags_p2 = extended_leakage_guard(test_data2.copy(), priority_filter="P2")
    
    if "summary_award_mark" in flags_p0:
        print("  PASS: P0 filter works")
    else:
        print("  FAIL: P0 filter should detect award_mark")
        all_passed = False
    
    if "summary_award_mark" not in flags_p2:
        print("  PASS: P2 filter correctly excludes P0 rules")
    else:
        print("  FAIL: P2 filter should not detect P0 rules")
        all_passed = False
    
    print(f"\n{'='*50}")
    if all_passed:
        print("All tests PASSED!")
        sys.exit(0)
    else:
        print("Some tests FAILED!")
        sys.exit(1)
