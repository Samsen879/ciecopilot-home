-- invariants_vlm.sql
-- VLM 表验证套件 (question_descriptions_v0, vlm_jobs_v0, vlm_runs_v0)
-- 执行顺序: 无依赖，可独立执行
-- 预期结果: 所有查询返回 0 行表示通过

-- ============================================================
-- question_descriptions_v0 验证
-- ============================================================

-- V01: 检查 session 枚举值
-- 预期: 0 行
SELECT 'V01' AS test_id, id, session
FROM question_descriptions_v0
WHERE session NOT IN ('s', 'w', 'm');

-- V02: 检查 doc_type 枚举值 (只允许 qp)
-- 预期: 0 行
SELECT 'V02' AS test_id, id, doc_type
FROM question_descriptions_v0
WHERE doc_type != 'qp';

-- V03: 检查 status 枚举值
-- 预期: 0 行
SELECT 'V03' AS test_id, id, status
FROM question_descriptions_v0
WHERE status NOT IN ('ok', 'blocked', 'error');

-- V04: 检查 NOT NULL 字段
-- 预期: 0 行
SELECT 'V04' AS test_id, id
FROM question_descriptions_v0
WHERE storage_key IS NULL
   OR sha256 IS NULL
   OR syllabus_code IS NULL
   OR session IS NULL
   OR year IS NULL
   OR doc_type IS NULL
   OR paper IS NULL
   OR variant IS NULL
   OR q_number IS NULL
   OR status IS NULL
   OR provider IS NULL
   OR model IS NULL
   OR prompt_version IS NULL
   OR extractor_version IS NULL
   OR raw_json IS NULL;

-- V05: 检查 sha256 格式
-- 预期: 0 行
SELECT 'V05' AS test_id, id, sha256
FROM question_descriptions_v0
WHERE sha256 !~ '^[a-f0-9]{64}$';

-- V06: 检查 response_sha256 格式 (如果非空)
-- 预期: 0 行
SELECT 'V06' AS test_id, id, response_sha256
FROM question_descriptions_v0
WHERE response_sha256 IS NOT NULL AND response_sha256 !~ '^[a-f0-9]{64}$';

-- V07: 检查 confidence 范围 (0-1)
-- 预期: 0 行
SELECT 'V07' AS test_id, id, confidence
FROM question_descriptions_v0
WHERE confidence IS NOT NULL AND (confidence < 0 OR confidence > 1);

-- V08: 检查 year 范围
-- 预期: 0 行
SELECT 'V08' AS test_id, id, year
FROM question_descriptions_v0
WHERE year NOT BETWEEN 2016 AND 2030;

-- V09: 检查 paper 范围
-- 预期: 0 行
SELECT 'V09' AS test_id, id, paper
FROM question_descriptions_v0
WHERE paper NOT BETWEEN 1 AND 7;

-- V10: 检查 variant 范围
-- 预期: 0 行
SELECT 'V10' AS test_id, id, variant
FROM question_descriptions_v0
WHERE variant NOT BETWEEN 1 AND 6;

-- V11: 检查 q_number 正数
-- 预期: 0 行
SELECT 'V11' AS test_id, id, q_number
FROM question_descriptions_v0
WHERE q_number <= 0;

-- V12: 检查唯一性约束
-- 预期: 0 行
SELECT 'V12' AS test_id, storage_key, sha256, extractor_version, provider, model, prompt_version, COUNT(*)
FROM question_descriptions_v0
GROUP BY storage_key, sha256, extractor_version, provider, model, prompt_version
HAVING COUNT(*) > 1;

-- V13: 检查 leakage_flags 是有效 JSONB
-- 预期: 0 行
SELECT 'V13' AS test_id, id
FROM question_descriptions_v0
WHERE leakage_flags IS NULL;

-- ============================================================
-- vlm_jobs_v0 验证
-- ============================================================

-- V14: 检查 status 枚举值
-- 预期: 0 行
SELECT 'V14' AS test_id, job_id, status
FROM vlm_jobs_v0
WHERE status NOT IN ('pending', 'running', 'done', 'blocked', 'error');

-- V15: 检查 NOT NULL 字段
-- 预期: 0 行
SELECT 'V15' AS test_id, job_id
FROM vlm_jobs_v0
WHERE storage_key IS NULL
   OR sha256 IS NULL
   OR syllabus_code IS NULL
   OR session IS NULL
   OR year IS NULL
   OR doc_type IS NULL
   OR paper IS NULL
   OR variant IS NULL
   OR q_number IS NULL
   OR extractor_version IS NULL
   OR provider IS NULL
   OR model IS NULL
   OR prompt_version IS NULL
   OR status IS NULL;

-- V16: 检查 attempts 非负
-- 预期: 0 行
SELECT 'V16' AS test_id, job_id, attempts
FROM vlm_jobs_v0
WHERE attempts < 0;

-- V17: 检查 running 任务必须有 locked_by
-- 预期: 0 行
SELECT 'V17' AS test_id, job_id, status, locked_by
FROM vlm_jobs_v0
WHERE status = 'running' AND locked_by IS NULL;

-- V18: 检查 locked_at 与 locked_by 一致性
-- 预期: 0 行
SELECT 'V18' AS test_id, job_id, locked_by, locked_at
FROM vlm_jobs_v0
WHERE (locked_by IS NULL) != (locked_at IS NULL);

-- V19: 检查唯一性约束
-- 预期: 0 行
SELECT 'V19' AS test_id, storage_key, sha256, extractor_version, provider, model, prompt_version, COUNT(*)
FROM vlm_jobs_v0
GROUP BY storage_key, sha256, extractor_version, provider, model, prompt_version
HAVING COUNT(*) > 1;

-- ============================================================
-- vlm_runs_v0 验证
-- ============================================================

-- V20: 检查 status 枚举值
-- 预期: 0 行
SELECT 'V20' AS test_id, run_id, status
FROM vlm_runs_v0
WHERE status NOT IN ('running', 'success', 'failed');

-- V21: 检查 NOT NULL 字段
-- 预期: 0 行
SELECT 'V21' AS test_id, run_id
FROM vlm_runs_v0
WHERE started_at IS NULL
   OR status IS NULL
   OR config IS NULL
   OR counts IS NULL;

-- V22: 检查 running 状态无 finished_at
-- 预期: 0 行
SELECT 'V22' AS test_id, run_id, status, finished_at
FROM vlm_runs_v0
WHERE status = 'running' AND finished_at IS NOT NULL;

-- V23: 检查完成状态有 finished_at
-- 预期: 0 行
SELECT 'V23' AS test_id, run_id, status, finished_at
FROM vlm_runs_v0
WHERE status IN ('success', 'failed') AND finished_at IS NULL;

-- V24: 检查 started_at <= finished_at
-- 预期: 0 行
SELECT 'V24' AS test_id, run_id, started_at, finished_at
FROM vlm_runs_v0
WHERE finished_at IS NOT NULL AND started_at > finished_at;
