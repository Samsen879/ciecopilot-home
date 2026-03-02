-- invariants_asset.sql
-- 资产表验证套件 (exam_papers, paper_assets, ingest_runs)
-- 执行顺序: 无依赖，可独立执行
-- 预期结果: 所有查询返回 0 行表示通过

-- ============================================================
-- exam_papers 验证
-- ============================================================

-- A01: 检查 syllabus_code 格式 (应为4位数字)
-- 预期: 0 行
SELECT 'A01' AS test_id, id, syllabus_code
FROM exam_papers
WHERE syllabus_code !~ '^[0-9]{4}$';

-- A02: 检查 year 范围 (2016-2030)
-- 预期: 0 行
SELECT 'A02' AS test_id, id, year
FROM exam_papers
WHERE year NOT BETWEEN 2016 AND 2030;

-- A03: 检查 session 枚举值
-- 预期: 0 行
SELECT 'A03' AS test_id, id, session
FROM exam_papers
WHERE session NOT IN ('s', 'w', 'm');

-- A04: 检查 paper 范围 (1-7)
-- 预期: 0 行
SELECT 'A04' AS test_id, id, paper
FROM exam_papers
WHERE paper NOT BETWEEN 1 AND 7;

-- A05: 检查 variant 范围 (1-6)
-- 预期: 0 行
SELECT 'A05' AS test_id, id, variant
FROM exam_papers
WHERE variant NOT BETWEEN 1 AND 6;

-- A06: 检查 doc_type 枚举值
-- 预期: 0 行
SELECT 'A06' AS test_id, id, doc_type
FROM exam_papers
WHERE doc_type NOT IN ('qp', 'ms');

-- A07: 检查 source_sha256 格式 (如果非空)
-- 预期: 0 行
SELECT 'A07' AS test_id, id, source_sha256
FROM exam_papers
WHERE source_sha256 IS NOT NULL AND source_sha256 !~ '^[a-f0-9]{64}$';

-- A08: 检查 NOT NULL 字段
-- 预期: 0 行
SELECT 'A08' AS test_id, id
FROM exam_papers
WHERE syllabus_code IS NULL
   OR year IS NULL
   OR session IS NULL
   OR paper IS NULL
   OR variant IS NULL
   OR doc_type IS NULL;

-- A09: 检查重复记录 (业务键唯一性)
-- 预期: 0 行
SELECT 'A09' AS test_id, syllabus_code, year, session, paper, variant, doc_type, COUNT(*)
FROM exam_papers
GROUP BY syllabus_code, year, session, paper, variant, doc_type
HAVING COUNT(*) > 1;

-- A10: 检查 created_at <= updated_at
-- 预期: 0 行
SELECT 'A10' AS test_id, id, created_at, updated_at
FROM exam_papers
WHERE created_at > updated_at;

-- ============================================================
-- paper_assets 验证
-- ============================================================

-- A11: 检查孤儿资产 (paper_id 无效)
-- 预期: 0 行
SELECT 'A11' AS test_id, pa.id, pa.paper_id
FROM paper_assets pa
LEFT JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE ep.id IS NULL;

-- A12: 检查 asset_type 枚举值
-- 预期: 0 行
SELECT 'A12' AS test_id, id, asset_type
FROM paper_assets
WHERE asset_type NOT IN ('qp_page', 'question_img', 'ms_page', 'ms_question_img', 'contact_sheet');

-- A13: 检查 sha256 格式
-- 预期: 0 行
SELECT 'A13' AS test_id, id, sha256
FROM paper_assets
WHERE sha256 !~ '^[a-f0-9]{64}$';

-- A14: 检查 storage_key 唯一性
-- 预期: 0 行
SELECT 'A14' AS test_id, storage_key, COUNT(*)
FROM paper_assets
GROUP BY storage_key
HAVING COUNT(*) > 1;

-- A15: 检查 NOT NULL 字段
-- 预期: 0 行
SELECT 'A15' AS test_id, id
FROM paper_assets
WHERE paper_id IS NULL
   OR asset_type IS NULL
   OR storage_key IS NULL
   OR sha256 IS NULL;

-- A16: 检查 width/height 正数 (如果非空)
-- 预期: 0 行
SELECT 'A16' AS test_id, id, width, height
FROM paper_assets
WHERE (width IS NOT NULL AND width <= 0)
   OR (height IS NOT NULL AND height <= 0);

-- A17: 检查 file_size 正数 (如果非空)
-- 预期: 0 行
SELECT 'A17' AS test_id, id, file_size
FROM paper_assets
WHERE file_size IS NOT NULL AND file_size <= 0;

-- ============================================================
-- ingest_runs 验证
-- ============================================================

-- A18: 检查 run_type 枚举值
-- 预期: 0 行
SELECT 'A18' AS test_id, id, run_type
FROM ingest_runs
WHERE run_type NOT IN ('full_scan', 'incremental', 'single_paper');

-- A19: 检查 status 枚举值
-- 预期: 0 行
SELECT 'A19' AS test_id, id, status
FROM ingest_runs
WHERE status NOT IN ('running', 'completed', 'failed', 'cancelled');

-- A20: 检查计数非负
-- 预期: 0 行
SELECT 'A20' AS test_id, id
FROM ingest_runs
WHERE papers_total < 0
   OR papers_inserted < 0
   OR papers_updated < 0
   OR assets_total < 0
   OR assets_inserted < 0
   OR assets_skipped < 0
   OR errors_count < 0;

-- A21: 检查完成运行的计数平衡
-- 预期: 0 行
SELECT 'A21' AS test_id, id, papers_total, papers_inserted, papers_updated
FROM ingest_runs
WHERE status = 'completed'
  AND papers_total != papers_inserted + papers_updated;

-- A22: 检查 started_at <= completed_at
-- 预期: 0 行
SELECT 'A22' AS test_id, id, started_at, completed_at
FROM ingest_runs
WHERE completed_at IS NOT NULL AND started_at > completed_at;
