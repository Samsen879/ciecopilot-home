-- Migration: Create asset management tables
-- Description: exam_papers, paper_assets, ingest_runs for asset tracking
-- Note: assessment_item_assets deferred (requires assessment_items table)

-- ============================================================
-- 1. exam_papers - 试卷元数据表
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_papers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syllabus_code   VARCHAR(4) NOT NULL,
    year            SMALLINT NOT NULL,
    session         VARCHAR(1) NOT NULL,
    paper           SMALLINT NOT NULL,
    variant         SMALLINT NOT NULL,
    doc_type        VARCHAR(2) NOT NULL,
    page_count      SMALLINT,
    source_sha256   VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT exam_papers_syllabus_check CHECK (syllabus_code ~ '^[0-9]{4}$'),
    CONSTRAINT exam_papers_year_check CHECK (year BETWEEN 2016 AND 2030),
    CONSTRAINT exam_papers_session_check CHECK (session IN ('s', 'w', 'm')),
    CONSTRAINT exam_papers_paper_check CHECK (paper BETWEEN 1 AND 7),
    CONSTRAINT exam_papers_variant_check CHECK (variant BETWEEN 1 AND 6),
    CONSTRAINT exam_papers_doc_type_check CHECK (doc_type IN ('qp', 'ms')),
    CONSTRAINT exam_papers_unique UNIQUE (syllabus_code, year, session, paper, variant, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_exam_papers_syllabus ON exam_papers(syllabus_code);
CREATE INDEX IF NOT EXISTS idx_exam_papers_year_session ON exam_papers(year, session);

-- ============================================================
-- 2. paper_assets - 试卷级资产表
-- ============================================================
CREATE TABLE IF NOT EXISTS paper_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id        UUID NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
    asset_type      VARCHAR(20) NOT NULL,
    storage_key     VARCHAR(255) NOT NULL UNIQUE,
    sha256          VARCHAR(64) NOT NULL,
    page_number     SMALLINT,
    q_number        SMALLINT,
    subpart         VARCHAR(10),
    width           INTEGER,
    height          INTEGER,
    file_size       BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT paper_assets_type_check CHECK (
        asset_type IN ('qp_page', 'question_img', 'ms_page', 'ms_question_img')
    ),
    CONSTRAINT paper_assets_sha256_check CHECK (sha256 ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_paper_assets_paper_id ON paper_assets(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_assets_sha256 ON paper_assets(sha256);
CREATE INDEX IF NOT EXISTS idx_paper_assets_type ON paper_assets(asset_type);

-- ============================================================
-- 3. ingest_runs - 入库运行记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS ingest_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type        VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'running',
    manifest_sha256 VARCHAR(64),
    manifest_path   TEXT,
    assets_root     TEXT,
    note            TEXT,
    papers_total    INTEGER NOT NULL DEFAULT 0,
    papers_inserted INTEGER NOT NULL DEFAULT 0,
    papers_updated  INTEGER NOT NULL DEFAULT 0,
    assets_total    INTEGER NOT NULL DEFAULT 0,
    assets_inserted INTEGER NOT NULL DEFAULT 0,
    assets_skipped  INTEGER NOT NULL DEFAULT 0,
    errors_count    INTEGER NOT NULL DEFAULT 0,
    errors          JSONB,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    
    CONSTRAINT ingest_runs_type_check CHECK (run_type IN ('full_scan', 'incremental', 'single_paper')),
    CONSTRAINT ingest_runs_status_check CHECK (status IN ('running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_ingest_runs_status ON ingest_runs(status);
CREATE INDEX IF NOT EXISTS idx_ingest_runs_started ON ingest_runs(started_at DESC);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exam_papers_updated_at ON exam_papers;
CREATE TRIGGER exam_papers_updated_at
    BEFORE UPDATE ON exam_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
