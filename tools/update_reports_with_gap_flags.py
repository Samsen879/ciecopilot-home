import argparse
import json
from pathlib import Path


def load_gap_map(path):
    if not Path(path).exists():
        return {}
    data = json.load(open(path, "r", encoding="utf-8"))
    mapping = {}
    for item in data:
        paper_dir = str(Path(item["file"]).parents[1]).replace("\\", "/")
        mapping.setdefault(paper_dir, []).append(item)
    return mapping


def main():
    parser = argparse.ArgumentParser(description="Append vertical-gap flags to review reports")
    parser.add_argument("--reports", default="docs/reviews/physics")
    parser.add_argument("--gaps", default="docs/physics_vertical_gap_flags.json")
    args = parser.parse_args()

    gap_map = load_gap_map(args.gaps)
    reports_dir = Path(args.reports)

    for report_path in reports_dir.glob("*.md"):
        content = report_path.read_text(encoding="utf-8")
        output_dir = ""
        for line in content.splitlines():
            if line.startswith("- Output dir:"):
                output_dir = line.replace("- Output dir:", "").strip()
                break
        key = output_dir.replace("\\", "/")
        flags = gap_map.get(key, [])

        lines = content.splitlines()
        if "## Vertical gap flags" in content:
            continue

        if flags:
            flag_lines = "\n".join(
                f"- {Path(item['file']).name}: max_blank_gap={item['max_blank_gap']}, height={item['height']}"
                for item in flags
            )
        else:
            flag_lines = "- None"

        lines.append("")
        lines.append("## Vertical gap flags")
        lines.append(flag_lines)

        report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
