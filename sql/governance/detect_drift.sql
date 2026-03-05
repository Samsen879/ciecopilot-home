-- ============================================================
-- detect_drift.sql - 数据漂移检测
-- 用途: 检测数据不一致、格式错误、约束违反
-- 执行: psql $DATABASE_URL -f sql/governance/detect_drift.sql
-- ============================================================

-- 1. SHA256 不匹配 (question_descriptions vs paper_assets)
-- 预期: 0 条
-- 修复: 重新运行 VLM 提取
SELECT 'sha256_mismatch' AS check_name,
       qd.id, qd.storage_key,
       qd.sha256 AS qd_sha256,
       pa.sha256 AS pa_sha256
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
WHERE qd.sha256 != pa.sha256
ORDER BY qd.created_at DESC
LIMIT 100;

-- 2. 元数据不一致 (question_descriptions vs exam_papers)
-- 预期: 0 条
-- 修复: 以 exam_papers 为准更新
SELECT 'metadata_mismatch' AS check_name,
       qd.id, qd.storage_key,
       qd.syllabus_code AS qd_syllabus, ep.syllabus_code AS ep_syllabus,
       qd.year AS qd_year, ep.year AS ep_year,
       qd.session AS qd_session, ep.session AS ep_session,
       qd.paper AS qd_paper, ep.paper AS ep_paper,
       qd.variant AS qd_variant, ep.variant AS ep_variant
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE qd.syllabus_code != ep.syllabus_code
   OR qd.year != ep.year
   OR qd.session != ep.session
   OR qd.paper != ep.paper
   OR qd.variant != ep.variant
ORDER BY qd.created_at DESC
LIMIT 100;

-- 3. storage_key 格式错误 (paper_assets)
-- 预期: 0 条
-- 修复: 手动修正或删除
SELECT 'invalid_storage_key_assets' AS check_name,
       id, storage_key, asset_type
FROM paper_assets
WHERE storage_key !~ '^\d{4}/(WM_\d{4}_)?[swm]\d{2}_(qp|ms)_\d\d/(source|pages|questions)/'
ORDER BY created_at DESC
LIMIT 100;

-- 4. storage_key 格式错误 (question_descriptions)
-- 预期: 0 条
-- 修复: 手动修正或删除
SELECT 'invalid_storage_key_descriptions' AS check_name,
       id, storage_key
FROM question_descriptions_v0
WHERE storage_key !~ '^\d{4}/(WM_\d{4}_)?[swm]\d{2}_(qp|ms)_\d\d/questions/q\d{1,2}'
ORDER BY created_at DESC
LIMIT 100;

-- 5. 枚举值越界 (exam_papers)
-- 预期: 0 条 (CHECK 约束应阻止)
-- 修复: 映射到有效值
SELECT 'invalid_enum_exam_papers' AS check_name,
       id, syllabus_code, year, session, paper, variant, doc_type,
       CASE
           WHEN session NOT IN ('s', 'w', 'm') THEN 'invalid_session'
           WHEN doc_type NOT IN ('qp', 'ms') THEN 'invalid_doc_type'
           WHEN paper NOT BETWEEN 1 AND 7 THEN 'invalid_paper'
           WHEN variant NOT BETWEEN 1 AND 6 THEN 'invalid_variant'
           WHEN year NOT BETWEEN 2016 AND 2030 THEN 'invalid_year'
       END AS violation
FROM exam_papers
WHERE session NOT IN ('s', 'w', 'm')
   OR doc_type NOT IN ('qp', 'ms')
   OR paper NOT BETWEEN 1 AND 7
   OR variant NOT BETWEEN 1 AND 6
   OR year NOT BETWEEN 2016 AND 2030
LIMIT 100;

-- 6. 枚举值越界 (paper_assets)
-- 预期: 0 条
-- 修复: 映射到有效值
SELECT 'invalid_enum_paper_assets' AS check_name,
       id, storage_key, asset_type
FROM paper_assets
WHERE asset_type NOT IN ('qp_page', 'question_img', 'ms_page', 'ms_question_img', 'contact_sheet')
LIMIT 100;

-- 7. 枚举值越界 (question_descriptions)
-- 预期: 0 条
-- 修复: 映射到有效值
SELECT 'invalid_enum_descriptions' AS check_name,
       id, storage_key, status, session, doc_type
FROM question_descriptions_v0
WHERE status NOT IN ('ok', 'blocked', 'error')
   OR session NOT IN ('s', 'w', 'm')
   OR doc_type NOT IN ('qp')
LIMIT 100;

-- 8. 时间戳异常 (created_at > updated_at)
-- 预期: 0 条
-- 修复: 设置 updated_at = created_at
SELECT 'timestamp_anomaly' AS check_name,
       'exam_papers' AS table_name, id, created_at, updated_at
FROM exam_papers
WHERE created_at > updated_at
UNION ALL
SELECT 'timestamp_anomaly', 'question_descriptions_v0', id::text, created_at, updated_at
FROM question_descriptions_v0
WHERE created_at > updated_at
UNION ALL
SELECT 'timestamp_anomaly', 'vlm_jobs_v0', job_id::text, created_at, updated_at
FROM vlm_jobs_v0
WHERE created_at > updated_at
LIMIT 100;

-- 9. 未来时间戳
-- 预期: 0 条
-- 修复: 设置为 NOW()
SELECT 'future_timestamp' AS check_name,
       'exam_papers' AS table_name, id, created_at
FROM exam_papers
WHERE created_at > NOW() + INTERVAL '1 hour'
UNION ALL
SELECT 'future_timestamp', 'paper_assets', id::text, created_at
FROM paper_assets
WHERE created_at > NOW() + INTERVAL '1 hour'
UNION ALL
SELECT 'future_timestamp', 'question_descriptions_v0', id::text, created_at
FROM question_descriptions_v0
WHERE created_at > NOW() + INTERVAL '1 hour'
LIMIT 100;

-- 10. SHA256 格式错误
-- 预期: 0 条 (CHECK 约束应阻止)
-- 修复: 重新计算
SELECT 'invalid_sha256_format' AS check_name,
       'paper_assets' AS table_name, id, sha256
FROM paper_assets
WHERE sha256 !~ '^[a-f0-9]{64}$'
UNION ALL
SELECT 'invalid_sha256_format', 'question_descriptions_v0', id::text, sha256
FROM question_descriptions_v0
WHERE sha256 !~ '^[a-f0-9]{64}$'
LIMIT 100;

-- 11. 缺失必填字段
-- 预期: 0 条
-- 修复: 从其他字段推断或删除
SELECT 'missing_required_fields' AS check_name,
       'exam_papers' AS table_name, id::text,
       CASE
           WHEN syllabus_code IS NULL THEN 'syllabus_code'
           WHEN year IS NULL THEN 'year'
           WHEN session IS NULL THEN 'session'
       END AS missing_field
FROM exam_papers
WHERE syllabus_code IS NULL OR year IS NULL OR session IS NULL
UNION ALL
SELECT 'missing_required_fields', 'paper_assets', id::text,
       CASE
           WHEN storage_key IS NULL THEN 'storage_key'
           WHEN sha256 IS NULL THEN 'sha256'
           WHEN asset_type IS NULL THEN 'asset_type'
       END
FROM paper_assets
WHERE storage_key IS NULL OR sha256 IS NULL OR asset_type IS NULL
UNION ALL
SELECT 'missing_required_fields', 'question_descriptions_v0', id::text,
       CASE
           WHEN storage_key IS NULL THEN 'storage_key'
           WHEN sha256 IS NULL THEN 'sha256'
           WHEN provider IS NULL THEN 'provider'
           WHEN model IS NULL THEN 'model'
       END
FROM question_descriptions_v0
WHERE storage_key IS NULL OR sha256 IS NULL OR provider IS NULL OR model IS NULL
LIMIT 100;

-- 12. ingest_runs 统计不一致
-- 预期: 少量 (历史数据可能不准)
-- 修复: 重新计算或接受
SELECT 'ingest_stats_drift' AS check_name,
       ir.id,
       ir.papers_inserted + ir.papers_updated AS reported_papers,
       ir.assets_inserted + ir.assets_skipped AS reported_assets,
       ir.status
FROM ingest_runs ir
WHERE ir.status = 'completed'
  AND (ir.papers_inserted + ir.papers_updated) = 0
  AND (ir.assets_inserted + ir.assets_skipped) > 0
LIMIT 50;

-- 13. 汇总统计
SELECT 'summary' AS check_name,
       (SELECT COUNT(*) FROM question_descriptions_v0 qd JOIN paper_assets pa ON qd.storage_key = pa.storage_key WHERE qd.sha256 != pa.sha256) AS sha256_mismatch,
       (SELECT COUNT(*) FROM paper_assets WHERE storage_key !~ '^\d{4}/(WM_\d{4}_)?[swm]\d{2}_(qp|ms)_\d\d/') AS invalid_storage_key,
       (SELECT COUNT(*) FROM exam_papers WHERE created_at > updated_at) AS timestamp_anomaly,
       (SELECT COUNT(*) FROM paper_assets WHERE sha256 !~ '^[a-f0-9]{64}$') AS invalid_sha256;
