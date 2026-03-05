import argparse
import json
from pathlib import Path


def load_anomaly_map(path):
    data = json.load(open(path, "r", encoding="utf-8"))
    mapping = {}
    for item in data.get("anomalies", []):
        paper = item["paper"].replace("\\", "/")
        mapping.setdefault(paper, []).append(item)
    return mapping


def main():
    parser = argparse.ArgumentParser(description="Update review status in reports")
    parser.add_argument("--reports", default="docs/reviews/physics")
    parser.add_argument("--anomalies", default="docs/physics_qc_anomalies.json")
    args = parser.parse_args()

    anomaly_map = load_anomaly_map(args.anomalies)
    reports_dir = Path(args.reports)

    for report_path in reports_dir.glob("*.md"):
        content = report_path.read_text(encoding="utf-8")
        # Extract output dir line to map anomalies
        output_dir = ""
        for line in content.splitlines():
            if line.startswith("- Output dir:"):
                output_dir = line.replace("- Output dir:", "").strip()
                break
        key = output_dir.replace("\\", "/")
        anomalies = anomaly_map.get(key, [])

        if anomalies:
            status = "QC flagged — manual inspection required"
        else:
            status = "QC clean — manual inspection pending"

        new_lines = []
        for line in content.splitlines():
            if line.startswith("- Review status:"):
                new_lines.append(f"- Review status: {status}")
            else:
                new_lines.append(line)
        report_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
