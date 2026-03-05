#!/usr/bin/env python3
"""
generate_golden_set.py - Golden Set 分层采样生成

基于 sampling_strategy.md 的分层采样策略，从 question_descriptions_v0 生成 Golden Set 采样清单。

Usage:
    python scripts/evaluation/generate_golden_set.py --size 300 --output data/golden_set/sampling_manifest.json
    python scripts/evaluation/generate_golden_set.py --help
"""
from __future__ import annotations
import argparse
import json
import os
import random
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# 默认配额比例 (基于 sampling_strategy.md)
DEFAULT_QUOTAS = {
    "9709": 0.40,  # Mathematics
    "9231": 0.30,  # Further Mathematics
    "9702": 0.30,  # Physics
}

def get_supabase_client():
    """获取 Supabase 连接信息"""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None, None
    return url, key

def fetch_candidates(url: str, key: str, limit: int = 10000) -> list[dict]:
    """从 DB 获取候选记录"""
    endpoint = f"{url}/rest/v1/question_descriptions_v0"
    params = "select=storage_key,sha256,syllabus_code,year,session,paper,variant,q_number,subpart,question_type,answer_form,confidence,status&status=eq.ok&limit=" + str(limit)
    
    req = urllib.request.Request(f"{endpoint}?{params}")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())
    except Exception as e:
        print(f"Error fetching candidates: {e}", file=sys.stderr)
        return []

def generate_mock_candidates(size: int = 1000) -> list[dict]:
    """生成模拟候选数据（用于测试）"""
    candidates = []
    syllabuses = ["9709", "9231", "9702"]
    sessions = ["s", "w", "m"]
    years = list(range(2015, 2026))
    question_types = ["calculation", "proof", "graph", "diagram", "structured"]
    answer_forms = ["exact", "approx", "proof", "graph", "table", "other"]
    
    for i in range(size):
        syllabus = random.choice(syllabuses)
        year = random.choice(years)
        session = random.choice(sessions)
        paper = random.randint(1, 5)
        variant = random.randint(1, 3)
        q_number = random.randint(1, 12)
        
        candidates.append({
            "storage_key": f"{syllabus}/WM_{syllabus}_{session}{year % 100:02d}_qp_{paper}{variant}/questions/q{q_number:02d}.png",
            "sha256": f"mock_sha256_{i:06d}",
            "syllabus_code": syllabus,
            "year": year,
            "session": session,
            "paper": paper,
            "variant": variant,
            "q_number": q_number,
            "subpart": random.choice([None, "a", "b", "a_i", "b_ii"]),
            "question_type": random.choice(question_types),
            "answer_form": random.choice(answer_forms),
            "confidence": round(random.uniform(0.5, 1.0), 2),
            "status": "ok"
        })
    
    return candidates

def stratified_sample(candidates: list[dict], total_size: int, quotas: dict, seed: int) -> list[dict]:
    """分层随机采样"""
    random.seed(seed)
    
    # 按 syllabus_code 分组
    by_syllabus = defaultdict(list)
    for c in candidates:
        by_syllabus[c["syllabus_code"]].append(c)
    
    # 计算每个 syllabus 的配额
    syllabus_quotas = {}
    for syllabus, ratio in quotas.items():
        syllabus_quotas[syllabus] = max(1, int(total_size * ratio))
    
    # 从每层采样
    samples = []
    for syllabus, quota in syllabus_quotas.items():
        pool = by_syllabus.get(syllabus, [])
        if not pool:
            print(f"Warning: No candidates for syllabus {syllabus}", file=sys.stderr)
            continue
        
        # 二级分层：按 year 分组
        by_year = defaultdict(list)
        for c in pool:
            by_year[c["year"]].append(c)
        
        # 从每年采样
        per_year = max(1, quota // len(by_year)) if by_year else 0
        sampled = []
        for year, year_pool in sorted(by_year.items()):
            n = min(per_year, len(year_pool))
            sampled.extend(random.sample(year_pool, n))
        
        # 补足配额
        remaining = quota - len(sampled)
        if remaining > 0:
            unsampled = [c for c in pool if c not in sampled]
            if unsampled:
                sampled.extend(random.sample(unsampled, min(remaining, len(unsampled))))
        
        samples.extend(sampled[:quota])
    
    return samples

def generate_manifest(samples: list[dict], seed: int) -> dict:
    """生成采样清单"""
    # 统计
    by_syllabus = defaultdict(int)
    by_year = defaultdict(int)
    by_session = defaultdict(int)
    by_type = defaultdict(int)
    
    for s in samples:
        by_syllabus[s["syllabus_code"]] += 1
        by_year[s["year"]] += 1
        by_session[s["session"]] += 1
        if s.get("question_type"):
            by_type[s["question_type"]] += 1
    
    return {
        "version": "v1.0.0",
        "generated_at": datetime.now().isoformat(),
        "seed": seed,
        "total_samples": len(samples),
        "statistics": {
            "by_syllabus": dict(sorted(by_syllabus.items())),
            "by_year": dict(sorted(by_year.items())),
            "by_session": dict(sorted(by_session.items())),
            "by_question_type": dict(sorted(by_type.items())),
        },
        "samples": [
            {
                "storage_key": s["storage_key"],
                "sha256": s["sha256"],
                "syllabus_code": s["syllabus_code"],
                "year": s["year"],
                "session": s["session"],
                "paper": s["paper"],
                "variant": s["variant"],
                "q_number": s["q_number"],
                "subpart": s.get("subpart"),
                "extracted_question_type": s.get("question_type"),
                "extracted_answer_form": s.get("answer_form"),
                "extracted_confidence": s.get("confidence"),
                "annotation_status": "pending",
            }
            for s in samples
        ]
    }

def main():
    parser = argparse.ArgumentParser(
        description="Generate Golden Set sampling manifest based on stratified sampling strategy"
    )
    parser.add_argument("--size", type=int, default=300, help="Total sample size (default: 300, max: 500)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--output", type=str, default="data/golden_set/sampling_manifest.json", help="Output file path")
    parser.add_argument("--mock", action="store_true", help="Use mock data instead of DB")
    parser.add_argument("--quotas", type=str, help="Custom quotas JSON, e.g. '{\"9709\":0.5,\"9231\":0.25,\"9702\":0.25}'")
    args = parser.parse_args()
    
    # 验证 size
    if args.size > 500:
        print("Error: Golden Set size cannot exceed 500 (per golden_set_spec.md)", file=sys.stderr)
        sys.exit(1)
    
    # 解析配额
    quotas = DEFAULT_QUOTAS
    if args.quotas:
        try:
            quotas = json.loads(args.quotas)
        except json.JSONDecodeError as e:
            print(f"Error parsing quotas: {e}", file=sys.stderr)
            sys.exit(1)
    
    # 获取候选数据
    if args.mock:
        print("Using mock data...")
        candidates = generate_mock_candidates(1000)
    else:
        url, key = get_supabase_client()
        if not url or not key:
            print("Warning: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set, using mock data", file=sys.stderr)
            candidates = generate_mock_candidates(1000)
        else:
            print("Fetching candidates from DB...")
            candidates = fetch_candidates(url, key)
            if not candidates:
                print("No candidates found, using mock data", file=sys.stderr)
                candidates = generate_mock_candidates(1000)
    
    print(f"Total candidates: {len(candidates)}")
    
    # 分层采样
    samples = stratified_sample(candidates, args.size, quotas, args.seed)
    print(f"Sampled: {len(samples)}")
    
    # 生成清单
    manifest = generate_manifest(samples, args.seed)
    
    # 输出
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    print(f"Manifest saved to: {output_path}")
    print(f"\nStatistics:")
    print(f"  Total: {manifest['total_samples']}")
    for syllabus, count in manifest["statistics"]["by_syllabus"].items():
        print(f"  {syllabus}: {count} ({count/manifest['total_samples']*100:.1f}%)")

if __name__ == "__main__":
    main()
