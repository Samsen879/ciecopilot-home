-- distribution_queries.sql
-- VLM 提取分布查询集
-- 与 question_descriptions_v0, vlm_runs_v0, vlm_jobs_v0 表兼容

-- Q1: status 分布
SELECT 
    status,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY status
ORDER BY count DESC;

-- Q2: question_type 分布
SELECT 
    COALESCE(question_type, 'NULL') AS question_type,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY question_type
ORDER BY count DESC;

-- Q3: answer_form 分布
SELECT 
    COALESCE(answer_form, 'NULL') AS answer_form,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY answer_form
ORDER BY count DESC;

-- Q4: confidence 分布 (分桶)
SELECT 
    CASE 
        WHEN confidence < 0.3 THEN '0.0-0.3'
        WHEN confidence < 0.5 THEN '0.3-0.5'
        WHEN confidence < 0.7 THEN '0.5-0.7'
        WHEN confidence < 0.9 THEN '0.7-0.9'
        ELSE '0.9-1.0'
    END AS confidence_bucket,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
WHERE status = 'ok'
GROUP BY 1
ORDER BY 1;

-- Q5: confidence 统计
SELECT 
    COUNT(*) AS total,
    ROUND(AVG(confidence), 4) AS avg_confidence,
    ROUND(STDDEV(confidence), 4) AS stddev_confidence,
    MIN(confidence) AS min_confidence,
    MAX(confidence) AS max_confidence,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY confidence) AS median_confidence
FROM question_descriptions_v0
WHERE status = 'ok';

-- Q6: syllabus_code 分布
SELECT 
    syllabus_code,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY syllabus_code
ORDER BY syllabus_code;

-- Q7: year 分布
SELECT 
    year,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY year
ORDER BY year DESC;

-- Q8: session 分布
SELECT 
    session,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY session
ORDER BY session;

-- Q9: paper 分布
SELECT 
    paper,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY paper
ORDER BY paper;

-- Q10: q_number 分布
SELECT 
    q_number,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY q_number
ORDER BY q_number;

-- Q11: subpart 分布
SELECT 
    COALESCE(subpart, 'NULL') AS subpart,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY subpart
ORDER BY count DESC
LIMIT 20;

-- Q12: provider 分布
SELECT 
    provider,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY provider
ORDER BY count DESC;

-- Q13: model 分布
SELECT 
    model,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
GROUP BY model
ORDER BY count DESC;

-- Q14: leakage_flags 分布 (非空)
SELECT 
    jsonb_object_keys(leakage_flags) AS flag_type,
    COUNT(*) AS count
FROM question_descriptions_v0
WHERE leakage_flags != '{}'::jsonb
GROUP BY jsonb_object_keys(leakage_flags)
ORDER BY count DESC;

-- Q15: math_expressions_latex 数量分布
SELECT 
    COALESCE(array_length(math_expressions_latex, 1), 0) AS expr_count,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
WHERE status = 'ok'
GROUP BY 1
ORDER BY 1;

-- Q16: variables 数量分布
SELECT 
    COALESCE(array_length(variables, 1), 0) AS var_count,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
WHERE status = 'ok'
GROUP BY 1
ORDER BY 1;

-- Q17: units 数量分布
SELECT 
    COALESCE(array_length(units, 1), 0) AS unit_count,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM question_descriptions_v0
WHERE status = 'ok'
GROUP BY 1
ORDER BY 1;

-- Q18: vlm_runs_v0 状态分布
SELECT 
    status,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM vlm_runs_v0
GROUP BY status
ORDER BY count DESC;

-- Q19: vlm_jobs_v0 状态分布
SELECT 
    status,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM vlm_jobs_v0
GROUP BY status
ORDER BY count DESC;

-- Q20: vlm_jobs_v0 attempts 分布
SELECT 
    attempts,
    COUNT(*) AS count,
    ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS pct
FROM vlm_jobs_v0
GROUP BY attempts
ORDER BY attempts;
