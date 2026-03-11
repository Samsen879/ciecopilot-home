import argparse
import json
from pathlib import Path


DEFAULT_PRIORITY = {"too_blank": 0, "very_tall": 1, "too_small": 2, "too_dense": 3}


def sort_review_queue_entries(anomalies, priority=None):
    priority = priority or DEFAULT_PRIORITY

    def sort_key(entry):
        issue = entry.get("issue") or entry.get("issue_type") or ""
        paper = entry.get("paper") or entry.get("pdf_path") or ""
        file_name = entry.get("file") or entry.get("screenshot_path") or ""
        page_number = entry.get("page_number") or 0
        return (priority.get(issue, 9), paper, page_number, file_name)

    return sorted(anomalies, key=sort_key)


def build_review_queue_document(data, priority=None):
    anomalies = sort_review_queue_entries(data.get("anomalies", []), priority=priority)
    return {
        "root": data.get("root", ""),
        "totals": data.get("totals", {}),
        "queue": anomalies,
    }


def main():
    parser = argparse.ArgumentParser(description="Build manual review queue from QC anomalies")
    parser.add_argument("--anomalies", default="docs/physics_qc_anomalies.json")
    parser.add_argument("--out", default="docs/physics_review_queue.json")
    args = parser.parse_args()

    data = json.load(open(args.anomalies, "r", encoding="utf-8"))
    out = build_review_queue_document(data)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
