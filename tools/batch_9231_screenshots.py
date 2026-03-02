import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image
from PIL import ImageFile
import warnings

# Allow large images without warnings (expected for long stitched questions).
Image.MAX_IMAGE_PIXELS = None
ImageFile.LOAD_TRUNCATED_IMAGES = True
warnings.filterwarnings("ignore", category=Image.DecompressionBombWarning)


def iter_pdfs(root):
    return sorted(root.glob("*.pdf"))


def quick_qc(image_path):
    img = Image.open(image_path).convert("L")
    pixels = img.getdata()
    total = len(pixels)
    nonwhite = sum(1 for p in pixels if p < 245)
    ratio = nonwhite / total if total else 0
    return {
        "width": img.width,
        "height": img.height,
        "nonwhite_ratio": round(ratio, 4),
    }


def run_script(script, pdf_path, out_dir, dpi):
    cmd = [
        "python",
        str(script),
        "--pdf",
        str(pdf_path),
        "--out",
        str(out_dir),
        "--dpi",
        str(dpi),
    ]
    subprocess.run(cmd, check=True)


def process_paper(paper_dir, out_root, dpi):
    paper_dir = Path(paper_dir)
    out_root = Path(out_root)
    out_root.mkdir(parents=True, exist_ok=True)
    pdfs = iter_pdfs(paper_dir)

    batch_log = []
    for pdf_path in pdfs:
        paper_code = pdf_path.stem
        out_dir = out_root / paper_code
        log_path = out_dir / "screenshot_log.json"
        if log_path.exists():
            batch_log.append({"pdf": str(pdf_path), "status": "skipped"})
            continue

        out_dir.mkdir(parents=True, exist_ok=True)
        run_script(Path("tools") / "structured_screenshot.py", pdf_path, out_dir, dpi)

        qc = {}
        for image_path in sorted(out_dir.glob("q*.png")):
            qc[image_path.name] = quick_qc(image_path)
        qc_path = out_dir / "qc_summary.json"
        qc_path.write_text(json.dumps(qc, ensure_ascii=False, indent=2), encoding="utf-8")

        batch_log.append({"pdf": str(pdf_path), "status": "done", "output": str(out_dir)})

    batch_log_path = out_root / "batch_log.json"
    batch_log_path.write_text(json.dumps(batch_log, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Batch screenshots for 9231 Further Mathematics papers")
    parser.add_argument("--paper", required=True, help="paper1|paper2|paper3|paper4")
    parser.add_argument("--dpi", type=int, default=400)
    parser.add_argument("--out-root", default="outputs/screenshots/9231")
    args = parser.parse_args()

    paper = args.paper.lower()
    paper_dir = Path("data") / "past-papers" / "9231Further-Mathematics" / paper
    out_root = Path(args.out_root) / paper

    process_paper(paper_dir, out_root, args.dpi)


if __name__ == "__main__":
    main()
