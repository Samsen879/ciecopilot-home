from __future__ import annotations

import argparse
import base64
import json
import os
import random
import sys
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from openai import OpenAI

from scripts.common.env import load_project_env


load_project_env()


MODEL = "qwen3-vl-flash"
BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
JSON_BLOCK_REPLACEMENTS = ("```json", "```")
PAGE_CLASSES = {
    "clean_official_page",
    "footer_branding_only",
    "overlay_branding_on_content",
    "ad_or_qr_insert_page",
    "uncertain",
}
THIRD_PARTY_BRAND_TOKENS = (
    "papacambridge",
    "papa cambridge",
    "gce guide",
    "gceguide",
    "dynamic papers",
    "dynamicpapers",
    "exam-mate",
    "exam mate",
    "xtremepapers",
    "xtreme papers",
)
OFFICIAL_FOOTER_TOKENS = (
    "ucles",
    "cambridge",
    "cambridge international",
    "cambridge assessment",
    "turn over",
    "[turn over]",
)


def json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def parse_json_response(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    candidate = text.strip()
    try:
        return json.loads(candidate)
    except Exception:
        pass
    for marker in JSON_BLOCK_REPLACEMENTS:
        candidate = candidate.replace(marker, "")
    candidate = candidate.strip()
    try:
        return json.loads(candidate)
    except Exception:
        return None


def is_rate_limit_error(exc: Exception) -> bool:
    if getattr(exc, "status_code", None) == 429:
        return True
    body = str(exc).lower()
    return "429" in body or "rate limit" in body


def build_prompt(pdf_entry: dict[str, Any], page_number: int) -> str:
    return f"""你在做 PDF source sanitation 视觉审计。
只根据图片像素本身判断，不要根据文件名、站点名或外部猜测。

重要口径：
- Cambridge / UCLES / Cambridge International / Cambridge Assessment / 官方页码 / 官方版权脚注（例如 “© UCLES 2019”）都算官方内容，不算第三方 branding。
- 只有第三方站点名、第三方 logo、第三方推广字样、二维码、公众号/QQ群/微信号等，才算污染。

请判断这一页是否属于以下哪一类，只能选一个：
- clean_official_page: 看起来是正常官方试卷/mark scheme 页面，没有可见第三方 branding / 广告 / 二维码。
- footer_branding_only: 页面主体是正常官方内容，但边角、页脚、空白边距有小型第三方 logo / 站点名 / 水印，且不影响正文阅读。
- overlay_branding_on_content: 有第三方 branding / 水印覆盖在正文或表格内容区域上。
- ad_or_qr_insert_page: 这页主要是广告、推广、二维码、公众号、QQ群、站点宣传，不像正常官方试卷页。
- uncertain: 无法可靠判断。

额外判断：
- visible_third_party_branding: 是否看得到第三方站点名/logo/品牌字样
- qr_code_visible: 是否看得到二维码
- ad_or_promo_text_visible: 是否有明显广告/推广/引流文字
- intrudes_into_main_content: 污染是否进入正文/表格/题干主体区域

判定提醒：
- 如果页面只有官方抬头、官方页码、官方版权脚注，没有第三方站点名/logo，就应判为 clean_official_page。
- 如果右下角、左下角或边距有 PapaCambridge、GCE Guide、Dynamic Papers 等第三方站点名/logo，但没有压到正文，可判为 footer_branding_only。
- 如果第三方字样压在题干、表格、答案区之上，判为 overlay_branding_on_content。
- 如果整页主要是二维码、公众号、QQ群、广告宣传，判为 ad_or_qr_insert_page。

当前上下文：
- subject: {pdf_entry.get("subject")}
- source_type: {pdf_entry.get("source_type")}
- candidate_pdf: {pdf_entry.get("candidate_path")}
- page_number: {page_number}

请只返回 JSON：
{{
  "page_class": "clean_official_page|footer_branding_only|overlay_branding_on_content|ad_or_qr_insert_page|uncertain",
  "visible_third_party_branding": true,
  "qr_code_visible": false,
  "ad_or_promo_text_visible": false,
  "intrudes_into_main_content": false,
  "suspected_brand_text": "可见品牌字样；没有就写空字符串",
  "reason": "一句简短中文说明"
}}"""


def call_vlm_with_retry(client: OpenAI, image_path: Path, prompt: str, max_retries: int = 5) -> dict[str, Any]:
    image_bytes = image_path.read_bytes()
    b64 = base64.b64encode(image_bytes).decode("ascii")
    last_exc: Exception | None = None

    for attempt in range(max_retries):
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
                extra_body={"enable_thinking": False},
            )
            content = resp.choices[0].message.content if resp.choices else ""
            parsed = parse_json_response(content or "")
            if parsed is None:
                return {"parse_failed": True, "raw_text": content}
            return {"parse_failed": False, "result": parsed, "raw_text": content}
        except Exception as exc:  # pragma: no cover - integration path
            if not is_rate_limit_error(exc):
                raise
            last_exc = exc
            delay = (2 ** attempt) + random.random()
            time.sleep(delay)

    raise last_exc if last_exc else RuntimeError("Unknown retry failure")


def normalize_page_result(result: dict[str, Any], raw_text: str | None = None) -> dict[str, Any]:
    page_class = str(result.get("page_class") or "uncertain").strip()
    if page_class not in PAGE_CLASSES:
        page_class = "uncertain"
    return {
        "page_class": page_class,
        "visible_third_party_branding": bool(result.get("visible_third_party_branding")),
        "qr_code_visible": bool(result.get("qr_code_visible")),
        "ad_or_promo_text_visible": bool(result.get("ad_or_promo_text_visible")),
        "intrudes_into_main_content": bool(result.get("intrudes_into_main_content")),
        "suspected_brand_text": str(result.get("suspected_brand_text") or "").strip(),
        "reason": str(result.get("reason") or "").strip(),
        "raw_text": raw_text or "",
    }


def has_third_party_footer_signal(payload: dict[str, Any]) -> bool:
    haystack = " ".join(
        [
            str(payload.get("suspected_brand_text") or ""),
            str(payload.get("reason") or ""),
            str(payload.get("raw_text") or ""),
        ]
    ).lower()
    return any(token in haystack for token in THIRD_PARTY_BRAND_TOKENS)


def only_official_footer_signal(payload: dict[str, Any]) -> bool:
    haystack = " ".join(
        [
            str(payload.get("suspected_brand_text") or ""),
            str(payload.get("reason") or ""),
            str(payload.get("raw_text") or ""),
        ]
    ).lower()
    if has_third_party_footer_signal(payload):
        return False
    return any(token in haystack for token in OFFICIAL_FOOTER_TOKENS)


def postprocess_page_payload(payload: dict[str, Any]) -> dict[str, Any]:
    page_class = str(payload.get("page_class") or "uncertain")
    if (
        page_class == "footer_branding_only"
        and not payload.get("qr_code_visible")
        and not payload.get("ad_or_promo_text_visible")
        and not payload.get("intrudes_into_main_content")
        and only_official_footer_signal(payload)
    ):
        payload["page_class"] = "clean_official_page"
        payload["visible_third_party_branding"] = False
        payload["suspected_brand_text"] = ""
        if "官方" not in str(payload.get("reason") or ""):
            payload["reason"] = "仅包含官方页脚、版权或翻页提示，无第三方 branding。"
    return payload


def load_manifest_entries(manifest_paths: list[Path]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for manifest_path in manifest_paths:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        for entry in payload.get("entries", []):
            item = dict(entry)
            item["manifest_path"] = str(manifest_path.resolve())
            entries.append(item)
    return sorted(entries, key=lambda item: (str(item.get("subject") or ""), str(item.get("candidate_path") or "")))


def build_tasks(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for entry in entries:
        evidence_index_path = Path(entry["candidate_evidence_index_path"])
        pages_dir = evidence_index_path.parent / "pages"
        for image_path in sorted(pages_dir.glob("page_*.jpg")):
            page_number = int(image_path.stem.split("_")[-1])
            tasks.append(
                {
                    "subject": entry["subject"],
                    "source_type": entry["source_type"],
                    "original_pdf_path": entry["original_pdf_path"],
                    "candidate_path": entry["candidate_path"],
                    "manifest_path": entry["manifest_path"],
                    "page_number": page_number,
                    "image_path": str(image_path.resolve()),
                }
            )
    return tasks


def cache_file_for_task(cache_root: Path, task: dict[str, Any]) -> Path:
    candidate_path = Path(task["candidate_path"])
    return cache_root / str(task["subject"]) / task["source_type"] / candidate_path.stem / f"page_{int(task['page_number']):03d}.json"


def audit_single_page(task: dict[str, Any], cache_root: Path) -> dict[str, Any]:
    cache_path = cache_file_for_task(cache_root, task)
    ensure_dir(cache_path.parent)
    if cache_path.exists():
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        cached = postprocess_page_payload(cached)
        cache_path.write_text(json_dumps(cached), encoding="utf-8")
        return cached

    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is required")

    client = OpenAI(api_key=api_key, base_url=BASE_URL)
    image_path = Path(task["image_path"])
    prompt = build_prompt(task, int(task["page_number"]))
    call_result = call_vlm_with_retry(client, image_path, prompt)
    if call_result.get("parse_failed"):
        normalized = normalize_page_result({"page_class": "uncertain", "reason": "VLM 输出解析失败"}, call_result.get("raw_text"))
    else:
        normalized = normalize_page_result(call_result["result"], call_result.get("raw_text"))

    payload = {
        **task,
        **normalized,
        "audited_at": datetime.now(timezone.utc).isoformat(),
        "model": MODEL,
    }
    payload = postprocess_page_payload(payload)
    cache_path.write_text(json_dumps(payload), encoding="utf-8")
    return payload


def aggregate_pdf_results(entries: list[dict[str, Any]], page_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_candidate = defaultdict(list)
    for page in page_results:
        by_candidate[page["candidate_path"]].append(page)

    results = []
    for entry in entries:
        pages = sorted(by_candidate.get(entry["candidate_path"], []), key=lambda item: int(item["page_number"]))
        class_counts = Counter(page["page_class"] for page in pages)

        pdf_status = "clean"
        if any(page["page_class"] == "ad_or_qr_insert_page" for page in pages):
            pdf_status = "ad_or_qr_detected"
        elif any(page["page_class"] == "overlay_branding_on_content" for page in pages):
            pdf_status = "overlay_branding_detected"
        elif any(page["page_class"] == "footer_branding_only" for page in pages):
            pdf_status = "footer_branding_only"
        elif any(page["page_class"] == "uncertain" for page in pages):
            pdf_status = "uncertain"

        branded_pages = [
            {
                "page_number": page["page_number"],
                "page_class": page["page_class"],
                "suspected_brand_text": page["suspected_brand_text"],
                "reason": page["reason"],
                "image_path": page["image_path"],
            }
            for page in pages
            if page["page_class"] != "clean_official_page"
        ]

        results.append(
            {
                "subject": entry["subject"],
                "source_type": entry["source_type"],
                "original_pdf_path": entry["original_pdf_path"],
                "candidate_path": entry["candidate_path"],
                "candidate_url": entry.get("candidate_url"),
                "replacement_recommendation": entry.get("replacement_recommendation"),
                "candidate_page_count": entry["candidate_page_count"],
                "vlm_pdf_status": pdf_status,
                "page_class_counts": dict(class_counts),
                "non_clean_pages": branded_pages,
            }
        )
    return results


def summarize(pdf_results: list[dict[str, Any]], page_results: list[dict[str, Any]]) -> dict[str, Any]:
    pdf_status_counts = Counter(item["vlm_pdf_status"] for item in pdf_results)
    page_class_counts = Counter(item["page_class"] for item in page_results)
    return {
        "pdf_count": len(pdf_results),
        "page_count": len(page_results),
        "pdf_status_counts": dict(pdf_status_counts),
        "page_class_counts": dict(page_class_counts),
    }


def build_markdown(out_path: Path, payload: dict[str, Any]) -> None:
    summary = payload["summary"]
    pdf_results = payload["per_pdf_results"]

    lines = [
        "# RAG Step 3 Mirror Candidate VLM Audit",
        "",
        f"- Generated at: {payload['generated_at']}",
        f"- Model: {payload['model']}",
        f"- Cache root: {payload['cache_root']}",
        "",
        "## Headline",
        "",
        f"- PDF count: {summary['pdf_count']}",
        f"- Page count: {summary['page_count']}",
    ]

    for key, value in sorted(summary["pdf_status_counts"].items()):
        lines.append(f"- {key}: {value}")

    lines.extend(["", "## Non-Clean PDFs", ""])
    non_clean = [item for item in pdf_results if item["vlm_pdf_status"] != "clean"][:40]
    if non_clean:
        for item in non_clean:
            lines.append(
                f"- {item['candidate_path']} | status={item['vlm_pdf_status']} | non_clean_pages={len(item['non_clean_pages'])}"
            )
    else:
        lines.append("- None")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit mirror replacement candidates with qwen3-vl-flash.")
    parser.add_argument("--manifest", action="append", required=True, help="Mirror refetch manifest JSON. Repeatable.")
    parser.add_argument("--cache-root", default="runs/backend/rag_step3_pdf_mirror_vlm_audit_cache")
    parser.add_argument("--out-json", default="runs/backend/rag_step3_pdf_mirror_vlm_audit.json")
    parser.add_argument("--out-md", default="docs/reports/rag_step3_pdf_mirror_vlm_audit.md")
    parser.add_argument("--max-workers", type=int, default=5)
    parser.add_argument("--limit-pages", type=int, default=0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest_paths = [Path(path) for path in args.manifest]
    cache_root = Path(args.cache_root)
    out_json = Path(args.out_json)
    out_md = Path(args.out_md)
    ensure_dir(cache_root)
    ensure_dir(out_json.parent)
    ensure_dir(out_md.parent)

    entries = load_manifest_entries(manifest_paths)
    tasks = build_tasks(entries)
    if args.limit_pages and args.limit_pages > 0:
        tasks = tasks[: args.limit_pages]

    page_results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, min(args.max_workers, 5))) as executor:
        future_map = {executor.submit(audit_single_page, task, cache_root): task for task in tasks}
        for index, future in enumerate(as_completed(future_map), start=1):
            page_results.append(future.result())
            if index % 25 == 0:
                print(f"[progress] audited_pages={index}/{len(tasks)}")

    if args.limit_pages and args.limit_pages > 0:
        audited_candidate_paths = {item["candidate_path"] for item in page_results}
        entries = [item for item in entries if item["candidate_path"] in audited_candidate_paths]

    pdf_results = aggregate_pdf_results(entries, page_results)
    summary = summarize(pdf_results, page_results)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": MODEL,
        "base_url": BASE_URL,
        "cache_root": str(cache_root.resolve()),
        "manifest_paths": [str(path.resolve()) for path in manifest_paths],
        "summary": summary,
        "per_pdf_results": pdf_results,
    }
    out_json.write_text(json_dumps(payload), encoding="utf-8")
    build_markdown(out_md, payload)
    print(json_dumps(summary))
    print(f"out_json={out_json.resolve()}")
    print(f"out_md={out_md.resolve()}")


if __name__ == "__main__":
    main()
