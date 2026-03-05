-- invariants_cross_table.sql
-- 跨表验证套件
-- 执行顺序: 依赖 invariants_asset.sql 和 invariants_vlm.sql 先通过
-- 预期结果: 所有查询返回 0 行表示通过

-- ============================================================
-- 资产-VLM 关联验证
-- ============================================================

-- X01: VLM 描述的 storage_key 必须存在于 paper_assets
-- 预期: 0 行 (如果资产已入库)
SELECT 'X01' AS test_id, qd.id, qd.storage_key
FROM question_descriptions_v0 qd
LEFT JOIN paper_assets pa ON qd.storage_key = pa.storage_key
WHERE pa.id IS NULL;

-- X02: VLM 描述的 sha256 必须与 paper_assets 一致
-- 预期: 0 行
SELECT 'X02' AS test_id, qd.id, qd.storage_key, qd.sha256 AS qd_sha256, pa.sha256 AS pa_sha256
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
WHERE qd.sha256 != pa.sha256;

-- X03: VLM 任务的 storage_key 必须存在于 paper_assets
-- 预期: 0 行 (如果资产已入库)
SELECT 'X03' AS test_id, vj.job_id, vj.storage_key
FROM vlm_jobs_v0 vj
LEFT JOIN paper_assets pa ON vj.storage_key = pa.storage_key
WHERE pa.id IS NULL;

-- X04: VLM 任务的 sha256 必须与 paper_assets 一致
-- 预期: 0 行
SELECT 'X04' AS test_id, vj.job_id, vj.storage_key, vj.sha256 AS vj_sha256, pa.sha256 AS pa_sha256
FROM vlm_jobs_v0 vj
JOIN paper_assets pa ON vj.storage_key = pa.storage_key
WHERE vj.sha256 != pa.sha256;

-- X05: 完成的 VLM 任务必须有对应的描述记录
-- 预期: 0 行
SELECT 'X05' AS test_id, vj.job_id, vj.storage_key
FROM vlm_jobs_v0 vj
LEFT JOIN question_descriptions_v0 qd ON 
    vj.storage_key = qd.storage_key AND
    vj.sha256 = qd.sha256 AND
    vj.extractor_version = qd.extractor_version AND
    vj.provider = qd.provider AND
    vj.model = qd.model AND
    vj.prompt_version = qd.prompt_version
WHERE vj.status = 'done' AND qd.id IS NULL;

-- ============================================================
-- 试卷-资产关联验证
-- ============================================================

-- X06: 每个试卷至少有一个资产
-- 预期: 0 行 (如果资产已入库)
SELECT 'X06' AS test_id, ep.id, ep.syllabus_code, ep.year, ep.session, ep.paper, ep.variant
FROM exam_papers ep
LEFT JOIN paper_assets pa ON ep.id = pa.paper_id
WHERE pa.id IS NULL;

-- X07: qp 类型试卷应有 qp_page 资产
-- 预期: 0 行
SELECT 'X07' AS test_id, ep.id
FROM exam_papers ep
WHERE ep.doc_type = 'qp'
  AND NOT EXISTS (
    SELECT 1 FROM paper_assets pa 
    WHERE pa.paper_id = ep.id AND pa.asset_type = 'qp_page'
  );

-- X08: ms 类型试卷应有 ms_page 资产
-- 预期: 0 行
SELECT 'X08' AS test_id, ep.id
FROM exam_papers ep
WHERE ep.doc_type = 'ms'
  AND NOT EXISTS (
    SELECT 1 FROM paper_assets pa 
    WHERE pa.paper_id = ep.id AND pa.asset_type = 'ms_page'
  );

-- X09: question_img 资产必须属于 qp 类型试卷
-- 预期: 0 行
SELECT 'X09' AS test_id, pa.id, pa.asset_type, ep.doc_type
FROM paper_assets pa
JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE pa.asset_type = 'question_img' AND ep.doc_type != 'qp';

-- X10: ms_question_img 资产必须属于 ms 类型试卷
-- 预期: 0 行
SELECT 'X10' AS test_id, pa.id, pa.asset_type, ep.doc_type
FROM paper_assets pa
JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE pa.asset_type = 'ms_question_img' AND ep.doc_type != 'ms';

-- ============================================================
-- VLM 描述-试卷元数据一致性
-- ============================================================

-- X11: VLM 描述的 syllabus_code 必须与关联试卷一致
-- 预期: 0 行
SELECT 'X11' AS test_id, qd.id, qd.syllabus_code AS qd_code, ep.syllabus_code AS ep_code
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE qd.syllabus_code != ep.syllabus_code;

-- X12: VLM 描述的 year 必须与关联试卷一致
-- 预期: 0 行
SELECT 'X12' AS test_id, qd.id, qd.year AS qd_year, ep.year AS ep_year
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE qd.year != ep.year;

-- X13: VLM 描述的 session 必须与关联试卷一致
-- 预期: 0 行
SELECT 'X13' AS test_id, qd.id, qd.session AS qd_session, ep.session AS ep_session
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE qd.session != ep.session;

-- X14: VLM 描述的 paper 必须与关联试卷一致
-- 预期: 0 行
SELECT 'X14' AS test_id, qd.id, qd.paper AS qd_paper, ep.paper AS ep_paper
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE qd.paper != ep.paper;

-- X15: VLM 描述的 variant 必须与关联试卷一致
-- 预期: 0 行
SELECT 'X15' AS test_id, qd.id, qd.variant AS qd_variant, ep.variant AS ep_variant
FROM question_descriptions_v0 qd
JOIN paper_assets pa ON qd.storage_key = pa.storage_key
JOIN exam_papers ep ON pa.paper_id = ep.id
WHERE qd.variant != ep.variant;

-- ============================================================
-- curriculum_nodes 验证
-- ============================================================

-- X16: chunks 的 topic_path 必须在 curriculum_nodes 中存在 (非 unmapped)
-- 预期: 0 行
SELECT 'X16' AS test_id, c.id, c.topic_path
FROM chunks c
LEFT JOIN curriculum_nodes cn ON c.topic_path <@ cn.topic_path
WHERE c.topic_path != 'unmapped'::ltree AND cn.node_id IS NULL;

-- X17: curriculum_nodes 的 topic_path 必须唯一
-- 预期: 0 行
SELECT 'X17' AS test_id, topic_path::text, COUNT(*)
FROM curriculum_nodes
GROUP BY topic_path
HAVING COUNT(*) > 1;

-- X18: curriculum_nodes 不能有 unmapped 路径
-- 预期: 0 行
SELECT 'X18' AS test_id, node_id, topic_path
FROM curriculum_nodes
WHERE topic_path = 'unmapped'::ltree;

-- ============================================================
-- 入库运行统计验证
-- ============================================================

-- X19: 入库运行的 papers_inserted 不能超过实际试卷数
-- 预期: 0 行
SELECT 'X19' AS test_id, ir.id, ir.papers_inserted, 
       (SELECT COUNT(*) FROM exam_papers) AS actual_papers
FROM ingest_runs ir
WHERE ir.status = 'completed' 
  AND ir.papers_inserted > (SELECT COUNT(*) FROM exam_papers);

-- X20: 入库运行的 assets_inserted 不能超过实际资产数
-- 预期: 0 行
SELECT 'X20' AS test_id, ir.id, ir.assets_inserted,
       (SELECT COUNT(*) FROM paper_assets) AS actual_assets
FROM ingest_runs ir
WHERE ir.status = 'completed'
  AND ir.assets_inserted > (SELECT COUNT(*) FROM paper_assets);

-- X21: 没有正在运行的入库任务时，不应有 running 状态的 VLM 任务
-- 预期: 0 行 (如果系统空闲)
SELECT 'X21' AS test_id, vj.job_id, vj.status
FROM vlm_jobs_v0 vj
WHERE vj.status = 'running'
  AND NOT EXISTS (SELECT 1 FROM vlm_runs_v0 vr WHERE vr.status = 'running');
