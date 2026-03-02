-- comparison_queries.sql
-- VLM 提取对比查询集
-- 与 question_descriptions_v0, vlm_runs_v0, golden_set_v0 表兼容

-- Q1: 版本间 ok_rate 对比
SELECT 
    prompt_version,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY prompt_version
ORDER BY prompt_version;

-- Q2: 版本间 question_type 分布对比
SELECT 
    prompt_version,
    question_type,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY prompt_version) * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY prompt_version, question_type
ORDER BY prompt_version, count DESC;

-- Q3: 版本间 confidence 统计对比
SELECT 
    prompt_version,
    COUNT(*) AS total,
    ROUND(AVG(confidence), 4) AS avg_confidence,
    ROUND(STDDEV(confidence), 4) AS stddev_confidence
FROM question_descriptions_v0
WHERE status = 'ok'
GROUP BY prompt_version
ORDER BY prompt_version;

-- Q4: Provider 间 ok_rate 对比
SELECT 
    provider,
    model,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY provider, model
ORDER BY ok_rate_pct DESC;

-- Q5: 版本间变化的记录
WITH v1 AS (
    SELECT storage_key, sha256, status, question_type, confidence
    FROM question_descriptions_v0
    WHERE prompt_version = 'v0.1'
),
v2 AS (
    SELECT storage_key, sha256, status, question_type, confidence
    FROM question_descriptions_v0
    WHERE prompt_version = 'v0.2'
)
SELECT 
    v1.storage_key,
    v1.status AS v1_status,
    v2.status AS v2_status,
    v1.question_type AS v1_type,
    v2.question_type AS v2_type,
    v1.confidence AS v1_conf,
    v2.confidence AS v2_conf
FROM v1
JOIN v2 USING (storage_key, sha256)
WHERE v1.status != v2.status OR v1.question_type != v2.question_type
LIMIT 100;

-- Q6: 版本间回归统计
WITH v1 AS (
    SELECT storage_key, sha256, status
    FROM question_descriptions_v0
    WHERE prompt_version = 'v0.1'
),
v2 AS (
    SELECT storage_key, sha256, status
    FROM question_descriptions_v0
    WHERE prompt_version = 'v0.2'
)
SELECT 
    v1.status AS v1_status,
    v2.status AS v2_status,
    COUNT(*) AS count
FROM v1
JOIN v2 USING (storage_key, sha256)
GROUP BY v1.status, v2.status
ORDER BY v1.status, v2.status;

-- Q7: Golden Set 准确率对比 (按版本)
SELECT 
    q.prompt_version,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE q.question_type = g.question_type) AS type_match,
    ROUND(COUNT(*) FILTER (WHERE q.question_type = g.question_type)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS type_accuracy_pct,
    COUNT(*) FILTER (WHERE q.q_number = g.q_number) AS qnum_match,
    ROUND(COUNT(*) FILTER (WHERE q.q_number = g.q_number)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS qnum_accuracy_pct
FROM golden_set_v0 g
JOIN question_descriptions_v0 q ON g.storage_key = q.storage_key
WHERE g.review_status = 'approved'
GROUP BY q.prompt_version
ORDER BY q.prompt_version;

-- Q8: Golden Set 字段级准确率
SELECT 
    'syllabus_code' AS field,
    COUNT(*) FILTER (WHERE q.syllabus_code = g.syllabus_code) AS correct,
    COUNT(*) AS total,
    ROUND(COUNT(*) FILTER (WHERE q.syllabus_code = g.syllabus_code)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS accuracy_pct
FROM golden_set_v0 g
JOIN question_descriptions_v0 q ON g.storage_key = q.storage_key
WHERE g.review_status = 'approved'
UNION ALL
SELECT 
    'q_number' AS field,
    COUNT(*) FILTER (WHERE q.q_number = g.q_number) AS correct,
    COUNT(*) AS total,
    ROUND(COUNT(*) FILTER (WHERE q.q_number = g.q_number)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS accuracy_pct
FROM golden_set_v0 g
JOIN question_descriptions_v0 q ON g.storage_key = q.storage_key
WHERE g.review_status = 'approved'
UNION ALL
SELECT 
    'question_type' AS field,
    COUNT(*) FILTER (WHERE q.question_type = g.question_type) AS correct,
    COUNT(*) AS total,
    ROUND(COUNT(*) FILTER (WHERE q.question_type = g.question_type)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS accuracy_pct
FROM golden_set_v0 g
JOIN question_descriptions_v0 q ON g.storage_key = q.storage_key
WHERE g.review_status = 'approved';

-- Q9: 错误分类统计
WITH comparison AS (
    SELECT 
        g.storage_key,
        CASE 
            WHEN q.storage_key IS NULL THEN 'missing'
            WHEN q.question_type IS NULL AND g.question_type IS NOT NULL THEN 'missing_field'
            WHEN q.question_type != g.question_type THEN 'wrong'
            ELSE 'correct'
        END AS error_type
    FROM golden_set_v0 g
    LEFT JOIN question_descriptions_v0 q ON g.storage_key = q.storage_key
    WHERE g.review_status = 'approved'
)
SELECT 
    error_type,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM comparison
GROUP BY error_type
ORDER BY count DESC;

-- Q10: 置信度与准确率相关性
WITH accuracy_by_conf AS (
    SELECT 
        CASE 
            WHEN q.confidence < 0.5 THEN 'low (<0.5)'
            WHEN q.confidence < 0.8 THEN 'medium (0.5-0.8)'
            ELSE 'high (>=0.8)'
        END AS conf_bucket,
        CASE WHEN q.question_type = g.question_type THEN 1 ELSE 0 END AS is_correct
    FROM golden_set_v0 g
    JOIN question_descriptions_v0 q ON g.storage_key = q.storage_key
    WHERE g.review_status = 'approved' AND q.status = 'ok'
)
SELECT 
    conf_bucket,
    COUNT(*) AS total,
    SUM(is_correct) AS correct,
    ROUND(SUM(is_correct)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS accuracy_pct
FROM accuracy_by_conf
GROUP BY conf_bucket
ORDER BY conf_bucket;

-- Q11: 运行间吞吐量对比
SELECT 
    run_id,
    config->>'provider' AS provider,
    config->>'model' AS model,
    (counts->>'processed')::int AS processed,
    EXTRACT(EPOCH FROM (finished_at - started_at)) / 60 AS duration_min,
    ROUND((counts->>'processed')::numeric / NULLIF(EXTRACT(EPOCH FROM (finished_at - started_at)) / 60, 0), 2) AS jobs_per_min
FROM vlm_runs_v0
WHERE status = 'success' AND finished_at IS NOT NULL
ORDER BY started_at DESC
LIMIT 20;

-- Q12: 运行间错误率对比
SELECT 
    run_id,
    config->>'prompt_version' AS prompt_version,
    (counts->>'processed')::int AS processed,
    (counts->>'errors')::int AS errors,
    (counts->>'blocked')::int AS blocked,
    ROUND((counts->>'errors')::numeric / NULLIF((counts->>'processed')::int, 0) * 100, 2) AS error_rate_pct,
    ROUND((counts->>'blocked')::numeric / NULLIF((counts->>'processed')::int, 0) * 100, 2) AS blocked_rate_pct
FROM vlm_runs_v0
WHERE status = 'success'
ORDER BY started_at DESC
LIMIT 20;

-- Q13: 每日指标对比
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct,
    ROUND(AVG(confidence) FILTER (WHERE status = 'ok'), 4) AS avg_confidence
FROM question_descriptions_v0
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- Q14: Syllabus 间准确率对比
SELECT 
    g.syllabus_code,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE q.question_type = g.question_type) AS type_match,
    ROUND(COUNT(*) FILTER (WHERE q.question_type = g.question_type)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS type_accuracy_pct
FROM golden_set_v0 g
JOIN question_descriptions_v0 q ON g.storage_key = q.storage_key
WHERE g.review_status = 'approved'
GROUP BY g.syllabus_code
ORDER BY type_accuracy_pct;

-- Q15: 稳定性对比 (多次运行)
WITH multi_runs AS (
    SELECT 
        storage_key,
        sha256,
        COUNT(DISTINCT response_sha256) AS unique_outputs,
        COUNT(*) AS run_count
    FROM question_descriptions_v0
    GROUP BY storage_key, sha256
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) AS total_multi_run,
    COUNT(*) FILTER (WHERE unique_outputs = 1) AS consistent,
    COUNT(*) FILTER (WHERE unique_outputs > 1) AS inconsistent,
    ROUND(COUNT(*) FILTER (WHERE unique_outputs = 1)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS consistency_rate_pct
FROM multi_runs;

-- Q16: A/B 测试变体对比
SELECT 
    prompt_version AS variant,
    syllabus_code,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct,
    ROUND(AVG(confidence) FILTER (WHERE status = 'ok'), 4) AS avg_confidence
FROM question_descriptions_v0
WHERE prompt_version IN ('v0.1', 'v0.2')
GROUP BY prompt_version, syllabus_code
ORDER BY syllabus_code, prompt_version;

-- Q17: 版本间分布漂移检测
WITH v1_dist AS (
    SELECT question_type, COUNT(*)::numeric / SUM(COUNT(*)) OVER () AS pct
    FROM question_descriptions_v0
    WHERE prompt_version = 'v0.1'
    GROUP BY question_type
),
v2_dist AS (
    SELECT question_type, COUNT(*)::numeric / SUM(COUNT(*)) OVER () AS pct
    FROM question_descriptions_v0
    WHERE prompt_version = 'v0.2'
    GROUP BY question_type
)
SELECT 
    COALESCE(v1.question_type, v2.question_type) AS question_type,
    ROUND(COALESCE(v1.pct, 0) * 100, 2) AS v1_pct,
    ROUND(COALESCE(v2.pct, 0) * 100, 2) AS v2_pct,
    ROUND(ABS(COALESCE(v2.pct, 0) - COALESCE(v1.pct, 0)) * 100, 2) AS diff_pct
FROM v1_dist v1
FULL OUTER JOIN v2_dist v2 USING (question_type)
ORDER BY diff_pct DESC;

-- Q18: 基线与当前对比 (30天)
WITH baseline AS (
    SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
        ROUND(AVG(confidence), 4) AS avg_conf
    FROM question_descriptions_v0
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days'
),
current AS (
    SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
        ROUND(AVG(confidence), 4) AS avg_conf
    FROM question_descriptions_v0
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    'baseline' AS period,
    b.total,
    b.ok_count,
    ROUND(b.ok_count::numeric / NULLIF(b.total, 0) * 100, 2) AS ok_rate_pct,
    b.avg_conf
FROM baseline b
UNION ALL
SELECT 
    'current' AS period,
    c.total,
    c.ok_count,
    ROUND(c.ok_count::numeric / NULLIF(c.total, 0) * 100, 2) AS ok_rate_pct,
    c.avg_conf
FROM current c;
