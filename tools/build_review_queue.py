import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Build manual review queue from QC anomalies")
    parser.add_argument("--anomalies", default="docs/physics_qc_anomalies.json")
    parser.add_argument("--out", default="docs/physics_review_queue.json")
    args = parser.parse_args()

    data = json.load(open(args.anomalies, "r", encoding="utf-8"))
    anomalies = data.get("anomalies", [])

    priority = {"too_blank": 0, "very_tall": 1, "too_small": 2, "too_dense": 3}
    anomalies.sort(key=lambda a: (priority.get(a["issue"], 9), a["paper"], a["file"]))

    out = {
        "root": data.get("root", ""),
        "totals": data.get("totals", {}),
        "queue": anomalies,
    }
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
