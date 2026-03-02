-- coverage_queries.sql
-- VLM 提取覆盖率查询集
-- 与 question_descriptions_v0, vlm_runs_v0, vlm_jobs_v0 表兼容

-- Q1: 总体覆盖率统计
SELECT 
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_count,
    COUNT(*) FILTER (WHERE status = 'error') AS error_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0;

-- Q2: 按 syllabus_code 覆盖率
SELECT 
    syllabus_code,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_count,
    COUNT(*) FILTER (WHERE status = 'error') AS error_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY syllabus_code
ORDER BY syllabus_code;

-- Q3: 按 year 覆盖率
SELECT 
    year,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY year
ORDER BY year DESC;

-- Q4: 按 session 覆盖率
SELECT 
    session,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY session
ORDER BY session;

-- Q5: 按 paper 覆盖率
SELECT 
    syllabus_code,
    paper,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY syllabus_code, paper
ORDER BY syllabus_code, paper;

-- Q6: 按 variant 覆盖率
SELECT 
    syllabus_code,
    paper,
    variant,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY syllabus_code, paper, variant
ORDER BY syllabus_code, paper, variant;

-- Q7: 按 question_type 覆盖率
SELECT 
    COALESCE(question_type, 'NULL') AS question_type,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY question_type
ORDER BY total DESC;

-- Q8: 覆盖率矩阵 (syllabus × year)
SELECT 
    syllabus_code,
    year,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY syllabus_code, year
ORDER BY syllabus_code, year;

-- Q9: 覆盖率趋势 (按日)
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS daily_count,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) AS cumulative_total,
    SUM(COUNT(*) FILTER (WHERE status = 'ok')) OVER (ORDER BY DATE(created_at)) AS cumulative_ok
FROM question_descriptions_v0
GROUP BY DATE(created_at)
ORDER BY date;

-- Q10: 按 provider/model 覆盖率
SELECT 
    provider,
    model,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY provider, model
ORDER BY total DESC;

-- Q11: 低覆盖率组合识别 (ok_rate < 85%)
SELECT 
    syllabus_code,
    year,
    session,
    paper,
    variant,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY syllabus_code, year, session, paper, variant
HAVING COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) < 0.85
ORDER BY ok_rate_pct;

-- Q12: 按 prompt_version 覆盖率
SELECT 
    prompt_version,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY prompt_version
ORDER BY prompt_version;

-- Q13: 按 extractor_version 覆盖率
SELECT 
    extractor_version,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY extractor_version
ORDER BY extractor_version;

-- Q14: 每周覆盖率趋势
SELECT 
    DATE_TRUNC('week', created_at) AS week,
    COUNT(*) AS weekly_count,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'ok')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS ok_rate_pct
FROM question_descriptions_v0
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week;

-- Q15: 唯一 storage_key 覆盖统计
SELECT 
    COUNT(DISTINCT storage_key) AS unique_storage_keys,
    COUNT(DISTINCT storage_key) FILTER (WHERE status = 'ok') AS unique_ok_keys,
    COUNT(DISTINCT CASE WHEN status = 'ok' THEN syllabus_code END) AS covered_syllabuses,
    COUNT(DISTINCT CASE WHEN status = 'ok' THEN year END) AS covered_years
FROM question_descriptions_v0;
