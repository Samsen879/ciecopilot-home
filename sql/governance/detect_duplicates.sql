-- ============================================================
-- detect_duplicates.sql - 重复记录检测
-- 用途: 检测违反唯一性约束的逻辑重复数据
-- 执行: psql $DATABASE_URL -f sql/governance/detect_duplicates.sql
-- ============================================================

-- 1. paper_assets storage_key 重复
-- 预期: 0 条 (UNIQUE 约束应阻止)
-- 修复: 保留最新，删除旧记录
SELECT 'duplicate_storage_keys' AS check_name,
       storage_key, COUNT(*) AS cnt,
       ARRAY_AGG(id ORDER BY created_at DESC) AS ids
FROM paper_assets
GROUP BY storage_key
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;

-- 2. paper_assets sha256 重复 (同一文件多次入库)
-- 预期: 可能存在 (不同 storage_key 相同内容)
-- 修复: 通常无需修复，仅报告
SELECT 'duplicate_sha256' AS check_name,
       sha256, COUNT(*) AS cnt,
       ARRAY_AGG(storage_key) AS storage_keys
FROM paper_assets
GROUP BY sha256
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;

-- 3. exam_papers 业务键重复
-- 预期: 0 条 (UNIQUE 约束应阻止)
-- 修复: 合并或删除
SELECT 'duplicate_exam_papers' AS check_name,
       syllabus_code, year, session, paper, variant, doc_type,
       COUNT(*) AS cnt,
       ARRAY_AGG(id ORDER BY created_at DESC) AS ids
FROM exam_papers
GROUP BY syllabus_code, year, session, paper, variant, doc_type
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;

-- 4. question_descriptions 完全重复 (相同唯一键)
-- 预期: 0 条 (UNIQUE 约束应阻止)
-- 修复: 保留最新
SELECT 'duplicate_descriptions' AS check_name,
       storage_key, sha256, extractor_version, provider, model, prompt_version,
       COUNT(*) AS cnt,
       ARRAY_AGG(id ORDER BY created_at DESC) AS ids
FROM question_descriptions_v0
GROUP BY storage_key, sha256, extractor_version, provider, model, prompt_version
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;

-- 5. question_descriptions 逻辑重复 (同一题目多版本)
-- 预期: 可能存在 (不同 extractor_version)
-- 修复: 通常无需修复，仅报告
SELECT 'multi_version_descriptions' AS check_name,
       storage_key, sha256,
       COUNT(DISTINCT extractor_version) AS version_count,
       ARRAY_AGG(DISTINCT extractor_version) AS versions
FROM question_descriptions_v0
GROUP BY storage_key, sha256
HAVING COUNT(DISTINCT extractor_version) > 1
ORDER BY version_count DESC
LIMIT 50;

-- 6. vlm_jobs 重复任务
-- 预期: 0 条 (UNIQUE 约束应阻止)
-- 修复: 删除重复
SELECT 'duplicate_vlm_jobs' AS check_name,
       storage_key, sha256, extractor_version, provider, model, prompt_version,
       COUNT(*) AS cnt,
       ARRAY_AGG(job_id ORDER BY created_at DESC) AS job_ids
FROM vlm_jobs_v0
GROUP BY storage_key, sha256, extractor_version, provider, model, prompt_version
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;

-- 7. ingest_runs 同一 manifest 重复运行
-- 预期: 可能存在 (重试场景)
-- 修复: 通常无需修复
SELECT 'duplicate_ingest_runs' AS check_name,
       manifest_sha256,
       COUNT(*) AS cnt,
       ARRAY_AGG(id ORDER BY started_at DESC) AS run_ids,
       ARRAY_AGG(status) AS statuses
FROM ingest_runs
WHERE manifest_sha256 IS NOT NULL
GROUP BY manifest_sha256
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;

-- 8. paper_assets 同一 paper_id + asset_type + page_number 重复
-- 预期: 0 条
-- 修复: 保留最新
SELECT 'duplicate_page_assets' AS check_name,
       paper_id, asset_type, page_number,
       COUNT(*) AS cnt,
       ARRAY_AGG(id ORDER BY created_at DESC) AS ids
FROM paper_assets
WHERE page_number IS NOT NULL
GROUP BY paper_id, asset_type, page_number
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;

-- 9. paper_assets 同一 paper_id + q_number + subpart 重复
-- 预期: 0 条
-- 修复: 保留最新
SELECT 'duplicate_question_assets' AS check_name,
       paper_id, q_number, subpart,
       COUNT(*) AS cnt,
       ARRAY_AGG(id ORDER BY created_at DESC) AS ids
FROM paper_assets
WHERE q_number IS NOT NULL
GROUP BY paper_id, q_number, subpart
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 50;

-- 10. question_descriptions 同一题目不同 status
-- 预期: 可能存在 (重试后状态变化)
-- 修复: 检查是否需要清理旧状态
SELECT 'conflicting_status' AS check_name,
       storage_key, sha256,
       COUNT(DISTINCT status) AS status_count,
       ARRAY_AGG(DISTINCT status) AS statuses
FROM question_descriptions_v0
GROUP BY storage_key, sha256
HAVING COUNT(DISTINCT status) > 1
ORDER BY status_count DESC
LIMIT 50;

-- 11. 汇总统计
SELECT 'summary' AS check_name,
       (SELECT COUNT(*) FROM (SELECT storage_key FROM paper_assets GROUP BY storage_key HAVING COUNT(*) > 1) t) AS duplicate_storage_keys,
       (SELECT COUNT(*) FROM (SELECT sha256 FROM paper_assets GROUP BY sha256 HAVING COUNT(*) > 1) t) AS duplicate_sha256,
       (SELECT COUNT(*) FROM (SELECT syllabus_code, year, session, paper, variant, doc_type FROM exam_papers GROUP BY 1,2,3,4,5,6 HAVING COUNT(*) > 1) t) AS duplicate_exam_papers,
       (SELECT COUNT(*) FROM (SELECT storage_key, sha256, extractor_version, provider, model, prompt_version FROM question_descriptions_v0 GROUP BY 1,2,3,4,5,6 HAVING COUNT(*) > 1) t) AS duplicate_descriptions,
       (SELECT COUNT(*) FROM (SELECT storage_key, sha256 FROM question_descriptions_v0 GROUP BY 1,2 HAVING COUNT(DISTINCT extractor_version) > 1) t) AS multi_version_descriptions;
