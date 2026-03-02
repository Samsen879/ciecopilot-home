import argparse
from pathlib import Path

from PIL import Image, ImageFile

Image.MAX_IMAGE_PIXELS = None
ImageFile.LOAD_TRUNCATED_IMAGES = True


def make_contact_sheet(image_paths, out_path, cols=5, thumb_width=320):
    images = []
    for path in image_paths:
        try:
            img = Image.open(path).convert("RGB")
        except Exception:
            continue
        if img.width <= 0 or img.height <= 0:
            continue
        ratio = thumb_width / img.width
        thumb_height = int(img.height * ratio)
        if thumb_height <= 0:
            continue
        images.append(img.resize((thumb_width, thumb_height)))

    if not images:
        return

    rows = (len(images) + cols - 1) // cols
    max_h = max(img.height for img in images)
    sheet = Image.new("RGB", (cols * thumb_width, rows * max_h), "white")

    for idx, img in enumerate(images):
        row = idx // cols
        col = idx % cols
        x = col * thumb_width
        y = row * max_h
        sheet.paste(img, (x, y))

    sheet.save(out_path, format="PNG", optimize=False)


def main():
    parser = argparse.ArgumentParser(description="Create contact sheet for q*.png images")
    parser.add_argument("--dir", required=True, help="Directory containing q*.png")
    parser.add_argument("--cols", type=int, default=5)
    parser.add_argument("--thumb-width", type=int, default=320)
    args = parser.parse_args()

    target_dir = Path(args.dir)
    images = sorted(target_dir.glob("q*.png"))
    if not images:
        return
    out_path = target_dir / "contact_sheet.png"
    make_contact_sheet(images, out_path, cols=args.cols, thumb_width=args.thumb_width)


if __name__ == "__main__":
    main()
