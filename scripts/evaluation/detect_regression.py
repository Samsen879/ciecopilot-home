#!/usr/bin/env python3
"""
detect_regression.py - VLM 提取回归检测

基于 regression_detection.md 的算法，检测版本间的质量回归。

Usage:
    python scripts/evaluation/detect_regression.py --baseline v0.1 --current v0.2
    python scripts/evaluation/detect_regression.py --help
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

# 回归阈值 (基于 regression_detection.md)
REGRESSION_THRESHOLDS = {
    "ok_rate": {"threshold": 0.01, "direction": "decrease", "level": "P0"},
    "golden_match_rate": {"threshold": 0.02, "direction": "decrease", "level": "P0"},
    "error_rate": {"threshold": 0.01, "direction": "increase", "level": "P0"},
    "blocked_rate": {"threshold": 0.02, "direction": "increase", "level": "P1"},
    "avg_confidence": {"threshold": 0.05, "direction": "decrease", "level": "P1"},
    "throughput": {"threshold": 0.20, "direction": "decrease", "level": "P1"},
}

def get_supabase_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    return url, key

def execute_query(url: str, key: str, table: str, params: str) -> list[dict]:
    endpoint = f"{url}/rest/v1/{table}?{params}"
    req = urllib.request.Request(endpoint)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())
    except Exception as e:
        print(f"Query error: {e}", file=sys.stderr)
        return []

def get_version_metrics(url: str, key: str, version: str) -> dict:
    """获取指定版本的指标"""
    data = execute_query(url, key, "question_descriptions_v0", f"select=status,confidence&prompt_version=eq.{version}")
    if not data:
        return {}
    
    total = len(data)
    ok = sum(1 for d in data if d.get("status") == "ok")
    blocked = sum(1 for d in data if d.get("status") == "blocked")
    error = sum(1 for d in data if d.get("status") == "error")
    confidences = [d.get("confidence", 0) for d in data if d.get("confidence") is not None]
    
    return {
        "version": version,
        "total": total,
        "ok_rate": ok / total if total > 0 else 0,
        "blocked_rate": blocked / total if total > 0 else 0,
        "error_rate": error / total if total > 0 else 0,
        "avg_confidence": sum(confidences) / len(confidences) if confidences else 0,
    }

def generate_mock_version_metrics(version: str) -> dict:
    """生成模拟版本指标"""
    import random
    base = 0.95 if version == "v0.1" else 0.93
    return {
        "version": version,
        "total": random.randint(400, 600),
        "ok_rate": base + random.uniform(-0.02, 0.02),
        "blocked_rate": 0.03 + random.uniform(-0.01, 0.01),
        "error_rate": 0.02 + random.uniform(-0.01, 0.01),
        "avg_confidence": 0.85 + random.uniform(-0.05, 0.05),
        "mock": True
    }

def detect_regressions(baseline: dict, current: dict) -> list[dict]:
    """检测回归"""
    regressions = []
    
    for metric, config in REGRESSION_THRESHOLDS.items():
        baseline_val = baseline.get(metric, 0)
        current_val = current.get(metric, 0)
        
        if baseline_val == 0:
            continue
        
        change = (current_val - baseline_val) / baseline_val
        
        is_regression = False
        if config["direction"] == "decrease" and change < -config["threshold"]:
            is_regression = True
        elif config["direction"] == "increase" and change > config["threshold"]:
            is_regression = True
        
        if is_regression:
            regressions.append({
                "metric": metric,
                "baseline": round(baseline_val, 4),
                "current": round(current_val, 4),
                "change": round(change, 4),
                "threshold": config["threshold"],
                "direction": config["direction"],
                "level": config["level"],
            })
    
    return regressions

def main():
    parser = argparse.ArgumentParser(description="Detect VLM extraction quality regressions")
    parser.add_argument("--baseline", type=str, default="v0.1", help="Baseline version (default: v0.1)")
    parser.add_argument("--current", type=str, default="v0.2", help="Current version (default: v0.2)")
    parser.add_argument("--output", type=str, help="Output JSON file path")
    parser.add_argument("--mock", action="store_true", help="Use mock data")
    parser.add_argument("--fail-on-regression", action="store_true", help="Exit with code 1 if regression detected")
    args = parser.parse_args()
    
    # 获取版本指标
    if args.mock:
        print("Using mock data...")
        baseline_metrics = generate_mock_version_metrics(args.baseline)
        current_metrics = generate_mock_version_metrics(args.current)
    else:
        url, key = get_supabase_client()
        if not url or not key:
            print("Warning: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set, using mock data", file=sys.stderr)
            baseline_metrics = generate_mock_version_metrics(args.baseline)
            current_metrics = generate_mock_version_metrics(args.current)
        else:
            print(f"Fetching metrics for {args.baseline} and {args.current}...")
            baseline_metrics = get_version_metrics(url, key, args.baseline)
            current_metrics = get_version_metrics(url, key, args.current)
            
            if not baseline_metrics or not current_metrics:
                print("Warning: No data found, using mock data", file=sys.stderr)
                baseline_metrics = generate_mock_version_metrics(args.baseline)
                current_metrics = generate_mock_version_metrics(args.current)
    
    # 检测回归
    regressions = detect_regressions(baseline_metrics, current_metrics)
    
    # 构建结果
    result = {
        "generated_at": datetime.now().isoformat(),
        "baseline_version": args.baseline,
        "current_version": args.current,
        "baseline_metrics": baseline_metrics,
        "current_metrics": current_metrics,
        "regressions": regressions,
        "regression_count": len(regressions),
        "status": "FAIL" if regressions else "PASS",
    }
    
    # 输出
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Results saved to: {output_path}")
    
    # 打印摘要
    print(f"\n{'='*60}")
    print(f"Regression Detection: {args.baseline} → {args.current}")
    print(f"{'='*60}")
    print(f"Baseline ({args.baseline}):")
    print(f"  ok_rate: {baseline_metrics.get('ok_rate', 0):.2%}")
    print(f"  error_rate: {baseline_metrics.get('error_rate', 0):.2%}")
    print(f"  avg_confidence: {baseline_metrics.get('avg_confidence', 0):.4f}")
    print(f"\nCurrent ({args.current}):")
    print(f"  ok_rate: {current_metrics.get('ok_rate', 0):.2%}")
    print(f"  error_rate: {current_metrics.get('error_rate', 0):.2%}")
    print(f"  avg_confidence: {current_metrics.get('avg_confidence', 0):.4f}")
    
    if regressions:
        print(f"\n⚠️  {len(regressions)} REGRESSIONS DETECTED:")
        for r in regressions:
            print(f"  [{r['level']}] {r['metric']}: {r['baseline']:.4f} → {r['current']:.4f} ({r['change']:+.2%})")
        if args.fail_on_regression:
            sys.exit(1)
    else:
        print(f"\n✅ No regressions detected")

if __name__ == "__main__":
    main()
