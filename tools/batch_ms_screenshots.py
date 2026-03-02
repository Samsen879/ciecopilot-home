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


SUBJECT_DIRS = {
    "9709": Path("data") / "mark-schemes" / "9709Mathematics",
    "9231": Path("data") / "mark-schemes" / "9231Further-Mathematics",
    "9702": Path("data") / "mark-schemes" / "9702Physics",
}


def iter_pdfs(root):
    return sorted(root.rglob("*.pdf"))


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


def process_subject(subject, dpi, out_root):
    subject_root = SUBJECT_DIRS[subject]
    pdfs = iter_pdfs(subject_root)
    out_root = Path(out_root) / subject
    out_root.mkdir(parents=True, exist_ok=True)

    batch_log = []
    for pdf_path in pdfs:
        paper_code = pdf_path.stem
        out_dir = out_root / paper_code
        log_path = out_dir / "screenshot_log.json"
        if log_path.exists():
            batch_log.append({"pdf": str(pdf_path), "status": "skipped"})
            continue

        out_dir.mkdir(parents=True, exist_ok=True)
        try:
            run_script(Path("tools") / "ms_screenshot.py", pdf_path, out_dir, dpi)
        except subprocess.CalledProcessError as exc:
            batch_log.append(
                {
                    "pdf": str(pdf_path),
                    "status": "failed",
                    "error": str(exc),
                }
            )
            continue

        qc = {}
        for image_path in sorted(out_dir.glob("q*.png")):
            qc[image_path.name] = quick_qc(image_path)
        qc_path = out_dir / "qc_summary.json"
        qc_path.write_text(json.dumps(qc, ensure_ascii=False, indent=2), encoding="utf-8")

        contact_cmd = [
            "python",
            str(Path("tools") / "make_contact_sheet.py"),
            "--dir",
            str(out_dir),
        ]
        subprocess.run(contact_cmd, check=False)

        batch_log.append({"pdf": str(pdf_path), "status": "done", "output": str(out_dir)})

    batch_log_path = out_root / "batch_log.json"
    batch_log_path.write_text(json.dumps(batch_log, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Batch screenshots for Mark Scheme PDFs")
    parser.add_argument(
        "--subject",
        default="all",
        help="9709|9231|9702|all",
    )
    parser.add_argument("--dpi", type=int, default=400)
    parser.add_argument("--out-root", default="outputs/screenshots/ms")
    args = parser.parse_args()

    subjects = (
        list(SUBJECT_DIRS.keys()) if args.subject == "all" else [args.subject]
    )

    for subject in subjects:
        if subject not in SUBJECT_DIRS:
            raise SystemExit(f"Unknown subject: {subject}")
        process_subject(subject, args.dpi, args.out_root)


if __name__ == "__main__":
    main()
