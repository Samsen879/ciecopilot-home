-- Migration: Rename asset_* tables to canonical names
-- Canonical tables: exam_papers, paper_assets, ingest_runs

-- 1. Drop old exam_papers (empty, incompatible schema)
DROP TABLE IF EXISTS exam_papers CASCADE;

-- 2. Rename asset_papers -> exam_papers
ALTER TABLE asset_papers RENAME TO exam_papers;
ALTER TABLE exam_papers RENAME CONSTRAINT asset_papers_syllabus_check TO exam_papers_syllabus_check;
ALTER TABLE exam_papers RENAME CONSTRAINT asset_papers_year_check TO exam_papers_year_check;
ALTER TABLE exam_papers RENAME CONSTRAINT asset_papers_session_check TO exam_papers_session_check;
ALTER TABLE exam_papers RENAME CONSTRAINT asset_papers_paper_check TO exam_papers_paper_check;
ALTER TABLE exam_papers RENAME CONSTRAINT asset_papers_variant_check TO exam_papers_variant_check;
ALTER TABLE exam_papers RENAME CONSTRAINT asset_papers_doc_type_check TO exam_papers_doc_type_check;
ALTER TABLE exam_papers RENAME CONSTRAINT asset_papers_unique TO exam_papers_unique;
ALTER INDEX idx_asset_papers_syllabus RENAME TO idx_exam_papers_syllabus;
ALTER INDEX idx_asset_papers_year_session RENAME TO idx_exam_papers_year_session;

-- 3. Rename asset_files -> paper_assets
ALTER TABLE asset_files RENAME TO paper_assets;
ALTER TABLE paper_assets RENAME CONSTRAINT asset_files_type_check TO paper_assets_type_check;
ALTER TABLE paper_assets RENAME CONSTRAINT asset_files_sha256_check TO paper_assets_sha256_check;
ALTER INDEX idx_asset_files_paper_id RENAME TO idx_paper_assets_paper_id;
ALTER INDEX idx_asset_files_sha256 RENAME TO idx_paper_assets_sha256;
ALTER INDEX idx_asset_files_type RENAME TO idx_paper_assets_type;

-- 4. Rename asset_ingest_runs -> ingest_runs
ALTER TABLE asset_ingest_runs RENAME TO ingest_runs;
ALTER TABLE ingest_runs RENAME CONSTRAINT asset_ingest_runs_type_check TO ingest_runs_type_check;
ALTER TABLE ingest_runs RENAME CONSTRAINT asset_ingest_runs_status_check TO ingest_runs_status_check;
ALTER INDEX idx_asset_ingest_runs_status RENAME TO idx_ingest_runs_status;
ALTER INDEX idx_asset_ingest_runs_started RENAME TO idx_ingest_runs_started;

-- 5. Update trigger name
DROP TRIGGER IF EXISTS asset_papers_updated_at ON exam_papers;
CREATE TRIGGER exam_papers_updated_at
    BEFORE UPDATE ON exam_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
