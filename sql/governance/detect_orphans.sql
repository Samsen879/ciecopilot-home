-- ============================================================
-- detect_orphans.sql - 孤儿记录检测
-- 用途: 检测缺失父记录的数据，确保引用完整性
-- 执行: psql $DATABASE_URL -f sql/governance/detect_orphans.sql
-- ============================================================

-- 1. 孤儿 paper_assets (paper_id 无效)
-- 预期: 0 条记录
-- 修复: 删除或重建 exam_papers
SELECT 'orphan_paper_assets' AS check_name,
       pa.id, pa.storage_key, pa.paper_id, pa.created_at
FROM paper_assets pa
LEFT JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE ep.id IS NULL
ORDER BY pa.created_at DESC
LIMIT 100;

-- 2. 孤儿 question_descriptions (storage_key 无效)
-- 预期: 0 条记录
-- 修复: 重新入库 paper_assets 或删除
SELECT 'orphan_question_descriptions' AS check_name,
       qd.id, qd.storage_key, qd.sha256, qd.created_at
FROM question_descriptions_v0 qd
LEFT JOIN paper_assets pa ON qd.storage_key = pa.storage_key
WHERE pa.id IS NULL
ORDER BY qd.created_at DESC
LIMIT 100;

-- 3. 孤儿 vlm_jobs (storage_key 无效)
-- 预期: 0 条记录
-- 修复: 删除无效任务
SELECT 'orphan_vlm_jobs' AS check_name,
       vj.job_id, vj.storage_key, vj.status, vj.created_at
FROM vlm_jobs_v0 vj
LEFT JOIN paper_assets pa ON vj.storage_key = pa.storage_key
WHERE pa.id IS NULL
ORDER BY vj.created_at DESC
LIMIT 100;

-- 4. exam_papers 无任何 assets
-- 预期: 少量（新入库的空试卷）
-- 修复: 检查文件系统，重新扫描
SELECT 'exam_papers_without_assets' AS check_name,
       ep.id, ep.syllabus_code, ep.year, ep.session, ep.paper, ep.variant, ep.doc_type
FROM exam_papers ep
LEFT JOIN paper_assets pa ON pa.paper_id = ep.id
WHERE pa.id IS NULL
ORDER BY ep.created_at DESC
LIMIT 100;

-- 5. paper_assets (question_img) 无 question_descriptions
-- 预期: 待处理的资产
-- 修复: 运行 VLM 提取
SELECT 'assets_without_descriptions' AS check_name,
       pa.id, pa.storage_key, pa.sha256, pa.created_at
FROM paper_assets pa
LEFT JOIN question_descriptions_v0 qd ON pa.storage_key = qd.storage_key
WHERE pa.asset_type = 'question_img'
  AND qd.id IS NULL
ORDER BY pa.created_at DESC
LIMIT 100;

-- 6. ingest_runs 状态异常 (running 超过 2 小时)
-- 预期: 0 条记录
-- 修复: 标记为 failed
SELECT 'stale_ingest_runs' AS check_name,
       id, run_type, status, started_at,
       EXTRACT(EPOCH FROM (NOW() - started_at))/3600 AS hours_running
FROM ingest_runs
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '2 hours'
ORDER BY started_at
LIMIT 100;

-- 7. vlm_runs 状态异常 (running 超过 4 小时)
-- 预期: 0 条记录
-- 修复: 标记为 failed
SELECT 'stale_vlm_runs' AS check_name,
       run_id, status, started_at,
       EXTRACT(EPOCH FROM (NOW() - started_at))/3600 AS hours_running
FROM vlm_runs_v0
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '4 hours'
ORDER BY started_at
LIMIT 100;

-- 8. vlm_jobs 锁定超时 (locked 超过 30 分钟)
-- 预期: 0 条记录
-- 修复: 释放锁定
SELECT 'stale_vlm_job_locks' AS check_name,
       job_id, storage_key, status, locked_by, locked_at,
       EXTRACT(EPOCH FROM (NOW() - locked_at))/60 AS minutes_locked
FROM vlm_jobs_v0
WHERE locked_at IS NOT NULL
  AND locked_at < NOW() - INTERVAL '30 minutes'
ORDER BY locked_at
LIMIT 100;

-- 9. question_descriptions 引用不存在的 exam_papers 元数据
-- 预期: 0 条记录
-- 修复: 更新元数据或删除
SELECT 'descriptions_invalid_metadata' AS check_name,
       qd.id, qd.storage_key, qd.syllabus_code, qd.year, qd.session, qd.paper, qd.variant
FROM question_descriptions_v0 qd
WHERE NOT EXISTS (
    SELECT 1 FROM exam_papers ep
    WHERE ep.syllabus_code = qd.syllabus_code
      AND ep.year = qd.year
      AND ep.session = qd.session
      AND ep.paper = qd.paper
      AND ep.variant = qd.variant
      AND ep.doc_type = 'qp'
)
ORDER BY qd.created_at DESC
LIMIT 100;

-- 10. 汇总统计
SELECT 'summary' AS check_name,
       (SELECT COUNT(*) FROM paper_assets pa LEFT JOIN exam_papers ep ON pa.paper_id = ep.id WHERE ep.id IS NULL) AS orphan_paper_assets,
       (SELECT COUNT(*) FROM question_descriptions_v0 qd LEFT JOIN paper_assets pa ON qd.storage_key = pa.storage_key WHERE pa.id IS NULL) AS orphan_descriptions,
       (SELECT COUNT(*) FROM vlm_jobs_v0 vj LEFT JOIN paper_assets pa ON vj.storage_key = pa.storage_key WHERE pa.id IS NULL) AS orphan_vlm_jobs,
       (SELECT COUNT(*) FROM exam_papers ep LEFT JOIN paper_assets pa ON pa.paper_id = ep.id WHERE pa.id IS NULL) AS papers_without_assets,
       (SELECT COUNT(*) FROM ingest_runs WHERE status = 'running' AND started_at < NOW() - INTERVAL '2 hours') AS stale_ingest_runs,
       (SELECT COUNT(*) FROM vlm_runs_v0 WHERE status = 'running' AND started_at < NOW() - INTERVAL '4 hours') AS stale_vlm_runs;
