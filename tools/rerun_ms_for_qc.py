import argparse
import json
import subprocess
from pathlib import Path


def iter_pdfs(root):
    return {p.stem: p for p in root.rglob('*.pdf')}


def needs_rerun(qc_path, min_width, min_height):
    if not qc_path.exists():
        return True
    data = json.loads(qc_path.read_text(encoding='utf-8'))
    for info in data.values():
        if info.get('width', 0) < min_width or info.get('height', 0) < min_height:
            return True
    return False


def quick_qc(image_path):
    from PIL import Image

    img = Image.open(image_path).convert('L')
    pixels = img.getdata()
    total = len(pixels)
    nonwhite = sum(1 for p in pixels if p < 245)
    ratio = nonwhite / total if total else 0
    return {
        'width': img.width,
        'height': img.height,
        'nonwhite_ratio': round(ratio, 4),
    }


def main():
    parser = argparse.ArgumentParser(description='Rerun MS screenshots for QC failures')
    parser.add_argument('--subject', default='9709')
    parser.add_argument('--out-root', default='outputs/screenshots/ms')
    parser.add_argument('--pdf-root', default='data/mark-schemes/9709Mathematics')
    parser.add_argument('--dpi', type=int, default=400)
    parser.add_argument('--min-width', type=int, default=200)
    parser.add_argument('--min-height', type=int, default=80)
    args = parser.parse_args()

    out_root = Path(args.out_root) / args.subject
    pdf_map = iter_pdfs(Path(args.pdf_root))

    for out_dir in sorted(p for p in out_root.iterdir() if p.is_dir()):
        qc_path = out_dir / 'qc_summary.json'
        if not needs_rerun(qc_path, args.min_width, args.min_height):
            continue

        pdf_path = pdf_map.get(out_dir.name)
        if not pdf_path:
            continue

        for stale in (
            list(out_dir.glob('q*.png'))
            + list(out_dir.glob('wm_q*.png'))
            + [out_dir / 'contact_sheet.png', out_dir / 'qc_summary.json', out_dir / 'screenshot_log.json']
        ):
            if stale.exists():
                stale.unlink()

        subprocess.run(
            [
                'python',
                str(Path('tools') / 'ms_screenshot.py'),
                '--pdf',
                str(pdf_path),
                '--out',
                str(out_dir),
                '--dpi',
                str(args.dpi),
            ],
            check=True,
        )

        qc = {}
        for image_path in sorted(out_dir.glob('q*.png')):
            qc[image_path.name] = quick_qc(image_path)
        qc_path.write_text(json.dumps(qc, ensure_ascii=False, indent=2), encoding='utf-8')

        subprocess.run(
            [
                'python',
                str(Path('tools') / 'make_contact_sheet.py'),
                '--dir',
                str(out_dir),
            ],
            check=False,
        )


if __name__ == '__main__':
    main()
