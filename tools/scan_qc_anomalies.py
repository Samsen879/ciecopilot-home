import argparse
import json
from pathlib import Path


def iter_output_dirs(root):
    root = Path(root)
    subdirs = [p for p in root.iterdir() if p.is_dir()]
    if any(
        (p / "screenshot_log.json").exists() or (p / "qc_summary.json").exists()
        for p in subdirs
    ):
        for out_dir in sorted(subdirs):
            yield out_dir
        return

    for paper_dir in sorted(subdirs):
        for out_dir in sorted([p for p in paper_dir.iterdir() if p.is_dir()]):
            yield out_dir


def scan_qc(root_dir):
    root = Path(root_dir)
    anomalies = []
    totals = {"papers": 0, "images": 0}

    for out_dir in iter_output_dirs(root):
        qc_path = out_dir / "qc_summary.json"
        if not qc_path.exists():
            anomalies.append({"paper": str(out_dir), "issue": "missing_qc"})
            continue
        totals["papers"] += 1
        qc = json.load(open(qc_path, "r", encoding="utf-8"))
        for name, info in qc.items():
            totals["images"] += 1
            ratio = info.get("nonwhite_ratio", 0)
            width = info.get("width", 0)
            height = info.get("height", 0)
            if ratio < 0.005:
                anomalies.append(
                    {
                        "paper": str(out_dir),
                        "file": name,
                        "issue": "too_blank",
                        "nonwhite_ratio": ratio,
                        "width": width,
                        "height": height,
                    }
                )
            if ratio > 0.6:
                anomalies.append(
                    {
                        "paper": str(out_dir),
                        "file": name,
                        "issue": "too_dense",
                        "nonwhite_ratio": ratio,
                        "width": width,
                        "height": height,
                    }
                )
            if height > 20000:
                anomalies.append(
                    {
                        "paper": str(out_dir),
                        "file": name,
                        "issue": "very_tall",
                        "nonwhite_ratio": ratio,
                        "width": width,
                        "height": height,
                    }
                )
            if width < 1200 or height < 200:
                anomalies.append(
                    {
                        "paper": str(out_dir),
                        "file": name,
                        "issue": "too_small",
                        "nonwhite_ratio": ratio,
                        "width": width,
                        "height": height,
                    }
                )

    return totals, anomalies


def main():
    parser = argparse.ArgumentParser(description="Scan QC summaries for anomalies")
    parser.add_argument("--root", default="outputs/screenshots/physics")
    parser.add_argument("--out", default="docs/physics_qc_anomalies.json")
    args = parser.parse_args()

    totals, anomalies = scan_qc(args.root)
    out = {
        "root": args.root,
        "totals": totals,
        "anomalies": anomalies,
    }
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
