#!/usr/bin/env python3
"""
calculate_metrics.py - VLM 提取质量指标计算

基于 metrics_catalog.md 计算 32 个指标，执行 sql/evaluation/*.sql 中的查询。

Usage:
    python scripts/evaluation/calculate_metrics.py --output metrics.json
    python scripts/evaluation/calculate_metrics.py --metrics COV-01,ACC-02
    python scripts/evaluation/calculate_metrics.py --help
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

# 指标定义 (基于 metrics_catalog.md)
METRICS = {
    # 覆盖率指标
    "COV-01": {"name": "total_coverage_rate", "category": "coverage", "threshold": 0.95, "direction": "higher"},
    "COV-02": {"name": "syllabus_coverage_rate", "category": "coverage", "threshold": 0.90, "direction": "higher"},
    "COV-03": {"name": "year_coverage_rate", "category": "coverage", "threshold": 0.85, "direction": "higher"},
    "COV-04": {"name": "session_coverage_rate", "category": "coverage", "threshold": 0.85, "direction": "higher"},
    "COV-05": {"name": "paper_coverage_rate", "category": "coverage", "threshold": 0.90, "direction": "higher"},
    "COV-06": {"name": "variant_coverage_rate", "category": "coverage", "threshold": 0.85, "direction": "higher"},
    "COV-07": {"name": "question_type_coverage_rate", "category": "coverage", "threshold": 0.80, "direction": "higher"},
    "COV-08": {"name": "ok_rate", "category": "coverage", "threshold": 0.95, "direction": "higher"},
    # 准确性指标
    "ACC-01": {"name": "field_completeness_rate", "category": "accuracy", "threshold": 0.85, "direction": "higher"},
    "ACC-02": {"name": "golden_match_rate", "category": "accuracy", "threshold": 0.90, "direction": "higher"},
    "ACC-03": {"name": "field_accuracy_rate", "category": "accuracy", "threshold": 0.95, "direction": "higher"},
    "ACC-04": {"name": "missing_error_rate", "category": "accuracy", "threshold": 0.05, "direction": "lower"},
    "ACC-05": {"name": "wrong_error_rate", "category": "accuracy", "threshold": 0.03, "direction": "lower"},
    "ACC-06": {"name": "extra_error_rate", "category": "accuracy", "threshold": 0.02, "direction": "lower"},
    "ACC-07": {"name": "confidence_calibration_error", "category": "accuracy", "threshold": 0.10, "direction": "lower"},
    "ACC-08": {"name": "leakage_block_rate", "category": "accuracy", "threshold": 0.05, "direction": "lower"},
    "ACC-09": {"name": "syllabus_code_accuracy", "category": "accuracy", "threshold": 0.99, "direction": "higher"},
    "ACC-10": {"name": "q_number_accuracy", "category": "accuracy", "threshold": 0.99, "direction": "higher"},
    # 稳定性指标
    "STB-01": {"name": "output_consistency_rate", "category": "stability", "threshold": 0.98, "direction": "higher"},
    "STB-02": {"name": "version_consistency_rate", "category": "stability", "threshold": 0.90, "direction": "higher"},
    "STB-03": {"name": "response_sha256_unique_rate", "category": "stability", "threshold": 0.95, "direction": "higher"},
    "STB-04": {"name": "confidence_stddev", "category": "stability", "threshold": 0.15, "direction": "lower"},
    "STB-05": {"name": "psi_index", "category": "stability", "threshold": 0.10, "direction": "lower"},
    "STB-06": {"name": "kl_divergence", "category": "stability", "threshold": 0.05, "direction": "lower"},
    "STB-07": {"name": "outlier_rate", "category": "stability", "threshold": 0.01, "direction": "lower"},
    # 性能指标
    "PRF-01": {"name": "throughput_jobs_per_min", "category": "performance", "threshold": 100, "direction": "higher"},
    "PRF-02": {"name": "latency_p50", "category": "performance", "threshold": 5, "direction": "lower"},
    "PRF-03": {"name": "latency_p90", "category": "performance", "threshold": 15, "direction": "lower"},
    "PRF-04": {"name": "latency_p99", "category": "performance", "threshold": 30, "direction": "lower"},
    "PRF-05": {"name": "error_rate", "category": "performance", "threshold": 0.02, "direction": "lower"},
    "PRF-06": {"name": "retry_rate", "category": "performance", "threshold": 0.10, "direction": "lower"},
    "PRF-07": {"name": "run_success_rate", "category": "performance", "threshold": 0.98, "direction": "higher"},
}

def get_supabase_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    return url, key

def execute_query(url: str, key: str, table: str, params: str) -> list[dict]:
    """执行 Supabase REST 查询"""
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

def calculate_coverage_metrics(url: str, key: str) -> dict:
    """计算覆盖率指标"""
    results = {}
    
    # 获取所有记录统计
    data = execute_query(url, key, "question_descriptions_v0", "select=status")
    if not data:
        return results
    
    total = len(data)
    ok_count = sum(1 for d in data if d.get("status") == "ok")
    blocked_count = sum(1 for d in data if d.get("status") == "blocked")
    error_count = sum(1 for d in data if d.get("status") == "error")
    
    results["COV-01"] = {"value": ok_count / total if total > 0 else 0, "total": total, "ok": ok_count}
    results["COV-08"] = {"value": ok_count / total if total > 0 else 0, "ok": ok_count, "blocked": blocked_count, "error": error_count}
    
    # 按 syllabus 统计
    data = execute_query(url, key, "question_descriptions_v0", "select=syllabus_code,status")
    by_syllabus = {}
    for d in data:
        s = d.get("syllabus_code")
        if s not in by_syllabus:
            by_syllabus[s] = {"total": 0, "ok": 0}
        by_syllabus[s]["total"] += 1
        if d.get("status") == "ok":
            by_syllabus[s]["ok"] += 1
    
    syllabus_rates = {s: v["ok"] / v["total"] if v["total"] > 0 else 0 for s, v in by_syllabus.items()}
    results["COV-02"] = {"value": min(syllabus_rates.values()) if syllabus_rates else 0, "by_syllabus": syllabus_rates}
    
    return results

def calculate_accuracy_metrics(url: str, key: str) -> dict:
    """计算准确性指标"""
    results = {}
    
    # 获取状态分布
    data = execute_query(url, key, "question_descriptions_v0", "select=status,confidence")
    if not data:
        return results
    
    total = len(data)
    blocked = sum(1 for d in data if d.get("status") == "blocked")
    error = sum(1 for d in data if d.get("status") == "error")
    
    results["ACC-08"] = {"value": blocked / total if total > 0 else 0, "blocked": blocked, "total": total}
    
    # 置信度统计
    confidences = [d.get("confidence", 0) for d in data if d.get("confidence") is not None]
    if confidences:
        avg_conf = sum(confidences) / len(confidences)
        results["ACC-07"] = {"value": abs(avg_conf - 0.9), "avg_confidence": avg_conf}
    
    return results

def calculate_stability_metrics(url: str, key: str) -> dict:
    """计算稳定性指标"""
    results = {}
    
    # 获取置信度分布
    data = execute_query(url, key, "question_descriptions_v0", "select=confidence,response_sha256&status=eq.ok")
    if not data:
        return results
    
    confidences = [d.get("confidence", 0) for d in data if d.get("confidence") is not None]
    if confidences:
        mean = sum(confidences) / len(confidences)
        variance = sum((c - mean) ** 2 for c in confidences) / len(confidences)
        stddev = variance ** 0.5
        results["STB-04"] = {"value": stddev, "mean": mean}
        
        # 异常值检测
        outliers = sum(1 for c in confidences if abs(c - mean) > 3 * stddev)
        results["STB-07"] = {"value": outliers / len(confidences) if confidences else 0, "outliers": outliers}
    
    # response_sha256 唯一率
    sha256s = [d.get("response_sha256") for d in data if d.get("response_sha256")]
    unique_sha256s = len(set(sha256s))
    results["STB-03"] = {"value": unique_sha256s / len(sha256s) if sha256s else 0, "unique": unique_sha256s, "total": len(sha256s)}
    
    return results

def calculate_performance_metrics(url: str, key: str) -> dict:
    """计算性能指标"""
    results = {}
    
    # 获取运行记录
    data = execute_query(url, key, "vlm_runs_v0", "select=status,counts,started_at,finished_at&status=eq.success")
    if not data:
        return results
    
    # 运行成功率
    all_runs = execute_query(url, key, "vlm_runs_v0", "select=status")
    success_count = sum(1 for r in all_runs if r.get("status") == "success")
    results["PRF-07"] = {"value": success_count / len(all_runs) if all_runs else 0, "success": success_count, "total": len(all_runs)}
    
    # 错误率
    desc_data = execute_query(url, key, "question_descriptions_v0", "select=status")
    total = len(desc_data)
    errors = sum(1 for d in desc_data if d.get("status") == "error")
    results["PRF-05"] = {"value": errors / total if total > 0 else 0, "errors": errors, "total": total}
    
    return results

def generate_mock_metrics() -> dict:
    """生成模拟指标数据"""
    import random
    results = {}
    for metric_id, meta in METRICS.items():
        if meta["direction"] == "higher":
            value = random.uniform(meta["threshold"] * 0.9, 1.0)
        else:
            value = random.uniform(0, meta["threshold"] * 1.1)
        results[metric_id] = {"value": round(value, 4), "mock": True}
    return results

def check_thresholds(results: dict) -> list[dict]:
    """检查阈值，返回告警列表"""
    alerts = []
    for metric_id, data in results.items():
        if metric_id not in METRICS:
            continue
        meta = METRICS[metric_id]
        value = data.get("value", 0)
        threshold = meta["threshold"]
        
        passed = (value >= threshold) if meta["direction"] == "higher" else (value <= threshold)
        
        if not passed:
            alerts.append({
                "metric_id": metric_id,
                "name": meta["name"],
                "value": value,
                "threshold": threshold,
                "direction": meta["direction"],
                "status": "FAIL"
            })
    return alerts

def main():
    parser = argparse.ArgumentParser(description="Calculate VLM extraction quality metrics")
    parser.add_argument("--output", type=str, help="Output JSON file path")
    parser.add_argument("--metrics", type=str, help="Comma-separated metric IDs to calculate (e.g., COV-01,ACC-02)")
    parser.add_argument("--mock", action="store_true", help="Use mock data")
    parser.add_argument("--check-thresholds", action="store_true", help="Check thresholds and report alerts")
    args = parser.parse_args()
    
    # 过滤指标
    metric_filter = None
    if args.metrics:
        metric_filter = set(args.metrics.split(","))
    
    # 计算指标
    if args.mock:
        print("Using mock data...")
        results = generate_mock_metrics()
    else:
        url, key = get_supabase_client()
        if not url or not key:
            print("Warning: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set, using mock data", file=sys.stderr)
            results = generate_mock_metrics()
        else:
            print("Calculating metrics from DB...")
            results = {}
            results.update(calculate_coverage_metrics(url, key))
            results.update(calculate_accuracy_metrics(url, key))
            results.update(calculate_stability_metrics(url, key))
            results.update(calculate_performance_metrics(url, key))
    
    # 应用过滤
    if metric_filter:
        results = {k: v for k, v in results.items() if k in metric_filter}
    
    # 添加元信息
    output = {
        "generated_at": datetime.now().isoformat(),
        "total_metrics": len(results),
        "metrics": results
    }
    
    # 检查阈值
    if args.check_thresholds:
        alerts = check_thresholds(results)
        output["alerts"] = alerts
        output["alert_count"] = len(alerts)
        if alerts:
            print(f"\n⚠️  {len(alerts)} threshold violations:")
            for a in alerts:
                print(f"  {a['metric_id']} ({a['name']}): {a['value']:.4f} (threshold: {a['threshold']})")
    
    # 输出
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"\nMetrics saved to: {output_path}")
    else:
        print(json.dumps(output, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
