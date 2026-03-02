-- Migration: 20260201_data_quality_views.sql
-- Description: Data quality monitoring views for governance dashboard

-- ============================================================
-- 1. v_asset_coverage - 资产覆盖率视图
-- ============================================================
CREATE OR REPLACE VIEW v_asset_coverage AS
SELECT
    ep.syllabus_code,
    COUNT(DISTINCT ep.id) AS papers_count,
    COUNT(DISTINCT pa.id) AS assets_count,
    COUNT(DISTINCT CASE WHEN pa.asset_type = 'question_img' THEN pa.id END) AS question_imgs,
    COUNT(DISTINCT qd.id) AS descriptions_count,
    COUNT(DISTINCT CASE WHEN qd.status = 'ok' THEN qd.id END) AS descriptions_ok,
    COUNT(DISTINCT CASE WHEN qd.status = 'blocked' THEN qd.id END) AS descriptions_blocked,
    COUNT(DISTINCT CASE WHEN qd.status = 'error' THEN qd.id END) AS descriptions_error,
    ROUND(
        COUNT(DISTINCT qd.id)::numeric / 
        NULLIF(COUNT(DISTINCT CASE WHEN pa.asset_type = 'question_img' THEN pa.id END), 0) * 100, 
        2
    ) AS coverage_pct
FROM exam_papers ep
LEFT JOIN paper_assets pa ON pa.paper_id = ep.id
LEFT JOIN question_descriptions_v0 qd ON qd.storage_key = pa.storage_key
GROUP BY ep.syllabus_code;

-- ============================================================
-- 2. v_orphan_records - 孤儿记录视图
-- ============================================================
CREATE OR REPLACE VIEW v_orphan_records AS
SELECT 'orphan_paper_assets' AS check_type, COUNT(*) AS count
FROM paper_assets pa
LEFT JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE ep.id IS NULL
UNION ALL
SELECT 'orphan_descriptions', COUNT(*)
FROM question_descriptions_v0 qd
LEFT JOIN paper_assets pa ON qd.storage_key = pa.storage_key
WHERE pa.id IS NULL
UNION ALL
SELECT 'orphan_vlm_jobs', COUNT(*)
FROM vlm_jobs_v0 vj
LEFT JOIN paper_assets pa ON vj.storage_key = pa.storage_key
WHERE pa.id IS NULL
UNION ALL
SELECT 'papers_without_assets', COUNT(*)
FROM exam_papers ep
LEFT JOIN paper_assets pa ON pa.paper_id = ep.id
WHERE pa.id IS NULL
UNION ALL
SELECT 'stale_ingest_runs', COUNT(*)
FROM ingest_runs
WHERE status = 'running' AND started_at < NOW() - INTERVAL '2 hours'
UNION ALL
SELECT 'stale_vlm_runs', COUNT(*)
FROM vlm_runs_v0
WHERE status = 'running' AND started_at < NOW() - INTERVAL '4 hours';

-- ============================================================
-- 3. v_duplicate_records - 重复记录视图
-- ============================================================
CREATE OR REPLACE VIEW v_duplicate_records AS
SELECT 'duplicate_storage_keys' AS check_type, COUNT(*) AS count
FROM (SELECT storage_key FROM paper_assets GROUP BY storage_key HAVING COUNT(*) > 1) t
UNION ALL
SELECT 'duplicate_exam_papers', COUNT(*)
FROM (SELECT syllabus_code, year, session, paper, variant, doc_type 
      FROM exam_papers GROUP BY 1,2,3,4,5,6 HAVING COUNT(*) > 1) t
UNION ALL
SELECT 'duplicate_descriptions', COUNT(*)
FROM (SELECT storage_key, sha256, extractor_version, provider, model, prompt_version 
      FROM question_descriptions_v0 GROUP BY 1,2,3,4,5,6 HAVING COUNT(*) > 1) t;

-- ============================================================
-- 4. v_data_drift - 数据漂移视图
-- ============================================================
CREATE OR REPLACE VIEW v_data_drift AS
SELECT 'sha256_mismatch' AS check_type, COUNT(*) AS count
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
WHERE qd.sha256 != pa.sha256
UNION ALL
SELECT 'metadata_mismatch', COUNT(*)
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE qd.syllabus_code != ep.syllabus_code
   OR qd.year != ep.year
   OR qd.session != ep.session
   OR qd.paper != ep.paper
   OR qd.variant != ep.variant
UNION ALL
SELECT 'invalid_storage_key_assets', COUNT(*)
FROM paper_assets
WHERE storage_key !~ '^\d{4}/(WM_\d{4}_)?[swm]\d{2}_(qp|ms)_\d\d/'
UNION ALL
SELECT 'timestamp_anomaly', COUNT(*)
FROM exam_papers WHERE created_at > updated_at;

-- ============================================================
-- 5. v_quality_summary - 质量汇总视图
-- ============================================================
CREATE OR REPLACE VIEW v_quality_summary AS
SELECT
    (SELECT COUNT(*) FROM exam_papers) AS papers_total,
    (SELECT COUNT(*) FROM paper_assets) AS assets_total,
    (SELECT COUNT(*) FROM paper_assets WHERE asset_type = 'question_img') AS question_imgs,
    (SELECT COUNT(*) FROM question_descriptions_v0) AS descriptions_total,
    (SELECT COUNT(*) FROM question_descriptions_v0 WHERE status = 'ok') AS descriptions_ok,
    (SELECT COUNT(*) FROM question_descriptions_v0 WHERE status = 'blocked') AS descriptions_blocked,
    (SELECT COUNT(*) FROM question_descriptions_v0 WHERE status = 'error') AS descriptions_error,
    ROUND(
        (SELECT COUNT(*) FROM question_descriptions_v0)::numeric / 
        NULLIF((SELECT COUNT(*) FROM paper_assets WHERE asset_type = 'question_img'), 0) * 100,
        2
    ) AS extraction_coverage_pct,
    ROUND(AVG(qd.confidence), 3) AS avg_confidence,
    (SELECT COUNT(*) FROM question_descriptions_v0 WHERE leakage_flags != '{}'::jsonb) AS with_leakage_flags,
    (SELECT COUNT(*) FROM question_descriptions_v0 WHERE summary IS NULL) AS null_summary_count,
    -- Orphan counts
    (SELECT COUNT(*) FROM paper_assets pa LEFT JOIN exam_papers ep ON pa.paper_id = ep.id WHERE ep.id IS NULL) AS orphan_assets,
    (SELECT COUNT(*) FROM question_descriptions_v0 qd LEFT JOIN paper_assets pa ON qd.storage_key = pa.storage_key WHERE pa.id IS NULL) AS orphan_descriptions,
    -- Run status
    (SELECT COUNT(*) FROM ingest_runs WHERE status = 'running') AS active_ingest_runs,
    (SELECT COUNT(*) FROM vlm_runs_v0 WHERE status = 'running') AS active_vlm_runs,
    (SELECT COUNT(*) FROM ingest_runs WHERE status = 'failed' AND started_at > NOW() - INTERVAL '24 hours') AS failed_runs_24h
FROM question_descriptions_v0 qd
WHERE qd.status = 'ok';

-- ============================================================
-- 6. governance_checks - 审计日志表 (如果不存在)
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type TEXT NOT NULL,
    check_name TEXT NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result_count INTEGER NOT NULL DEFAULT 0,
    result_sample JSONB,
    status TEXT NOT NULL CHECK (status IN ('pass', 'warn', 'fail', 'repaired')),
    duration_ms INTEGER,
    details JSONB
);

CREATE INDEX IF NOT EXISTS idx_governance_checks_type ON governance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_governance_checks_executed ON governance_checks(executed_at DESC);
