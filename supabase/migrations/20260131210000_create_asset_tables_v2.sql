-- Migration: Create asset management tables (v2 - renamed to avoid conflict)
-- Description: asset_papers, asset_files, asset_ingest_runs for asset tracking

-- ============================================================
-- 1. asset_papers - 试卷元数据表
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_papers (
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
    
    CONSTRAINT asset_papers_syllabus_check CHECK (syllabus_code ~ '^[0-9]{4}$'),
    CONSTRAINT asset_papers_year_check CHECK (year BETWEEN 2016 AND 2030),
    CONSTRAINT asset_papers_session_check CHECK (session IN ('s', 'w', 'm')),
    CONSTRAINT asset_papers_paper_check CHECK (paper BETWEEN 1 AND 7),
    CONSTRAINT asset_papers_variant_check CHECK (variant BETWEEN 1 AND 6),
    CONSTRAINT asset_papers_doc_type_check CHECK (doc_type IN ('qp', 'ms')),
    CONSTRAINT asset_papers_unique UNIQUE (syllabus_code, year, session, paper, variant, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_asset_papers_syllabus ON asset_papers(syllabus_code);
CREATE INDEX IF NOT EXISTS idx_asset_papers_year_session ON asset_papers(year, session);

-- ============================================================
-- 2. asset_files - 资产文件表
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id        UUID NOT NULL REFERENCES asset_papers(id) ON DELETE CASCADE,
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
    
    CONSTRAINT asset_files_type_check CHECK (
        asset_type IN ('qp_page', 'question_img', 'ms_page', 'ms_question_img', 'contact_sheet')
    ),
    CONSTRAINT asset_files_sha256_check CHECK (sha256 ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_asset_files_paper_id ON asset_files(paper_id);
CREATE INDEX IF NOT EXISTS idx_asset_files_sha256 ON asset_files(sha256);
CREATE INDEX IF NOT EXISTS idx_asset_files_type ON asset_files(asset_type);

-- ============================================================
-- 3. asset_ingest_runs - 入库运行记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_ingest_runs (
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
    
    CONSTRAINT asset_ingest_runs_type_check CHECK (run_type IN ('full_scan', 'incremental', 'single_paper')),
    CONSTRAINT asset_ingest_runs_status_check CHECK (status IN ('running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_asset_ingest_runs_status ON asset_ingest_runs(status);
CREATE INDEX IF NOT EXISTS idx_asset_ingest_runs_started ON asset_ingest_runs(started_at DESC);

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

DROP TRIGGER IF EXISTS asset_papers_updated_at ON asset_papers;
CREATE TRIGGER asset_papers_updated_at
    BEFORE UPDATE ON asset_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
