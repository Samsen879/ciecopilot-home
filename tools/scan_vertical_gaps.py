import argparse
import json
from pathlib import Path

from PIL import Image, ImageFile

Image.MAX_IMAGE_PIXELS = None
ImageFile.LOAD_TRUNCATED_IMAGES = True


def max_blank_gap(image_path, row_threshold=0.01):
    img = Image.open(image_path).convert("L")
    w, h = img.size
    pixels = img.load()
    blank_rows = []
    for y in range(h):
        nonwhite = 0
        for x in range(0, w, 4):
            if pixels[x, y] < 245:
                nonwhite += 1
        ratio = nonwhite / (w / 4)
        blank_rows.append(ratio < row_threshold)

    max_gap = 0
    current = 0
    for is_blank in blank_rows:
        if is_blank:
            current += 1
            max_gap = max(max_gap, current)
        else:
            current = 0
    return max_gap, h


def main():
    parser = argparse.ArgumentParser(description="Scan very tall images for large blank gaps")
    parser.add_argument("--root", default="outputs/screenshots/physics")
    parser.add_argument("--min-height", type=int, default=20000)
    parser.add_argument("--gap", type=int, default=3000)
    parser.add_argument("--out", default="docs/physics_vertical_gap_flags.json")
    args = parser.parse_args()

    root = Path(args.root)
    flags = []

    for image_path in root.rglob("q*.png"):
        try:
            img = Image.open(image_path)
            if img.height < args.min_height:
                continue
            max_gap, height = max_blank_gap(image_path)
            if max_gap >= args.gap:
                flags.append(
                    {
                        "file": str(image_path),
                        "height": height,
                        "max_blank_gap": max_gap,
                    }
                )
        except Exception:
            continue

    Path(args.out).write_text(json.dumps(flags, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
