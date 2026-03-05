import argparse
import json
import re
from pathlib import Path


MS_ROOT = Path("outputs") / "screenshots" / "ms"
QP_ROOTS = {
    "9709": Path("outputs") / "screenshots" / "9709",
    "9231": Path("outputs") / "screenshots" / "9231",
    "9702": Path("outputs") / "screenshots" / "physics",
}


MS_CODE_RE = re.compile(r"^(?P<subject>\d{4})_(?P<season>[a-z]\d{2})_ms_(?P<paper>\d{2})")


def base_question(stem):
    match = re.match(r"^(q\d{2})", stem)
    return match.group(1) if match else None


def resolve_qp_dir(ms_dir, subject):
    match = MS_CODE_RE.match(ms_dir.name)
    if not match:
        return None
    season = match.group("season")
    paper_code = match.group("paper")
    paper_num = paper_code[0]
    qp_root = QP_ROOTS[subject]
    return qp_root / f"paper{paper_num}" / f"{subject}_{season}_qp_{paper_code}"


def verify_subject(subject, ms_root):
    subject_root = ms_root / subject
    if not subject_root.exists():
        return []

    results = []
    for ms_dir in sorted([p for p in subject_root.iterdir() if p.is_dir()]):
        qp_dir = resolve_qp_dir(ms_dir, subject)
        entry = {
            "ms_dir": str(ms_dir),
            "qp_dir": str(qp_dir) if qp_dir else None,
            "missing_in_ms": [],
            "extra_in_ms": [],
        }
        if not qp_dir or not qp_dir.exists():
            entry["missing_qp_dir"] = True
            results.append(entry)
            continue

        qp_questions = {p.stem for p in qp_dir.glob("q*.png")}
        ms_questions = {p.stem for p in ms_dir.glob("q*.png")}
        ms_base = {b for b in (base_question(stem) for stem in ms_questions) if b}

        entry["missing_in_ms"] = sorted(qp_questions - ms_base)
        entry["extra_in_ms"] = sorted(ms_base - qp_questions)
        results.append(entry)

    return results


def main():
    parser = argparse.ArgumentParser(description="Verify MS vs QP question alignment")
    parser.add_argument("--subject", default="all", help="9709|9231|9702|all")
    parser.add_argument("--ms-root", default=str(MS_ROOT))
    parser.add_argument("--out", default="docs/ms_alignment_report.json")
    args = parser.parse_args()

    ms_root = Path(args.ms_root)
    subjects = list(QP_ROOTS.keys()) if args.subject == "all" else [args.subject]

    report = {"ms_root": str(ms_root), "subjects": {}}
    for subject in subjects:
        report["subjects"][subject] = verify_subject(subject, ms_root)

    Path(args.out).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
