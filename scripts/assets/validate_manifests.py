#!/usr/bin/env python3
"""
validate_manifests.py - 验证 scan_assets.py 输出的聚合 manifest JSON

依赖: jsonschema
安装: python3 -m pip install jsonschema

Exit codes: 0=通过, 1=验证失败, 2=环境/文件错误
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("错误: 需要安装 jsonschema 库", file=sys.stderr)
    print("安装: python3 -m pip install jsonschema", file=sys.stderr)
    sys.exit(2)


def load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def make_paper_id(m: dict) -> str:
    y = str(m.get('year', '?'))[-2:] if m.get('year') else '?'
    return f"{m.get('syllabus_code','?')}/{m.get('session','?')}{y}_{m.get('doc_type','?')}_{m.get('paper','?')}{m.get('variant','?')}"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", "-i", type=Path, required=True)
    p.add_argument("--qp-schema", type=Path, default=Path("docs/schemas/paper_manifest.schema.json"))
    p.add_argument("--ms-schema", type=Path, default=Path("docs/schemas/mark_scheme_manifest.schema.json"))
    p.add_argument("--max-errors", type=int, default=50)
    p.add_argument("--allow-empty", action="store_true")
    args = p.parse_args()

    try:
        data = load_json(args.input)
        qp_schema = load_json(args.qp_schema)
        ms_schema = load_json(args.ms_schema)
    except FileNotFoundError as e:
        print(f"错误: 文件不存在 - {e.filename}", file=sys.stderr)
        sys.exit(2)
    except json.JSONDecodeError as e:
        print(f"错误: JSON 解析失败 - {e}", file=sys.stderr)
        sys.exit(2)

    manifests = data.get("manifests", [])
    if not manifests:
        print("=== Validation Summary ===\nTotal: 0\nempty_manifests: true")
        if args.allow_empty:
            print("✓ Empty allowed"); sys.exit(0)
        print("✗ Failed: manifests 为空", file=sys.stderr); sys.exit(1)

    qp_v = Draft202012Validator(qp_schema)
    ms_v = Draft202012Validator(ms_schema)
    errors, passed, failed, unknown = [], 0, 0, 0

    for i, m in enumerate(manifests):
        dt, pid = m.get("doc_type"), make_paper_id(m)
        if dt == "qp": v = qp_v
        elif dt == "ms": v = ms_v
        else:
            unknown += 1; failed += 1
            errors.append({"index":i,"paper_id":pid,"path":"doc_type","message":f"必须是 'qp'/'ms', 实际: {repr(dt)}"})
            continue
        errs = [{"index":i,"paper_id":pid,"path":".".join(str(x) for x in e.absolute_path) or "(root)","message":e.message} for e in v.iter_errors(m)]
        if errs: failed += 1; errors.extend(errs)
        else: passed += 1

    print(f"\n=== Validation Summary ===\nTotal: {passed+failed}\nPassed: {passed}\nFailed: {failed}\nunknown_doc_type: {unknown}\nempty_manifests: false")
    if errors:
        print(f"\n=== Errors (first {min(len(errors),args.max_errors)}) ===")
        for e in errors[:args.max_errors]: print(f"[{e['index']}] {e['paper_id']} | {e['path']} | {e['message']}")
        if len(errors)>args.max_errors: print(f"... +{len(errors)-args.max_errors} more")
        sys.exit(1)
    print("\n✓ All manifests valid"); sys.exit(0)

if __name__ == "__main__":
    main()
