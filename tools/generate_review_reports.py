import argparse
import json
from pathlib import Path


def load_anomalies(path):
    if not Path(path).exists():
        return {}
    data = json.load(open(path, "r", encoding="utf-8"))
    grouped = {}
    for item in data.get("anomalies", []):
        paper = item["paper"].replace("\\", "/")
        grouped.setdefault(paper, []).append(item)
    return grouped


def iter_output_dirs_with_group(root):
    root = Path(root)
    subdirs = [p for p in root.iterdir() if p.is_dir()]
    if any(
        (p / "screenshot_log.json").exists() or (p / "qc_summary.json").exists()
        for p in subdirs
    ):
        for out_dir in sorted(subdirs):
            yield root.name, out_dir
        return

    for paper_dir in sorted(subdirs):
        for out_dir in sorted([p for p in paper_dir.iterdir() if p.is_dir()]):
            yield paper_dir.name, out_dir


def main():
    parser = argparse.ArgumentParser(description="Generate per-paper review reports")
    parser.add_argument("--root", default="outputs/screenshots/physics")
    parser.add_argument("--out", default="docs/reviews/physics")
    parser.add_argument("--anomalies", default="docs/physics_qc_anomalies.json")
    args = parser.parse_args()

    root = Path(args.root)
    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)
    anomalies = load_anomalies(args.anomalies)

    for group_name, out_dir in iter_output_dirs_with_group(root):
        log_path = out_dir / "screenshot_log.json"
        if not log_path.exists():
            continue
        data = json.load(open(log_path, "r", encoding="utf-8"))
        outputs = data.get("outputs", [])
        contact_sheet = out_dir / "contact_sheet.png"

        rel_key = str(out_dir).replace("\\", "/")
        paper_anoms = anomalies.get(rel_key, [])
        anom_lines = ""
        if paper_anoms:
            for item in paper_anoms:
                anom_lines += f"- {item['file']}: {item['issue']} (ratio={item['nonwhite_ratio']}, {item['width']}x{item['height']})\n"
        else:
            anom_lines = "- None\n"

        report = f"""# Review Report: {out_dir.name}

- Paper group: {group_name}
- Source PDF: {data.get('pdf', '')}
- Output dir: {out_dir}
- Outputs: {len(outputs)}
- Contact sheet: {contact_sheet if contact_sheet.exists() else 'missing'}
- Review status: pending manual inspection

## QC anomaly flags
{anom_lines}

## Manual review notes
- Pending
"""
        report_path = out_root / f"{out_dir.name}.md"
        report_path.write_text(report, encoding="utf-8")


if __name__ == "__main__":
    main()
