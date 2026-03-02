-- Patch migration: add updated_at to paper_assets and finished_at/error_summary to ingest_runs

-- paper_assets: updated_at for idempotent upserts
ALTER TABLE paper_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE paper_assets SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS paper_assets_updated_at ON paper_assets;
CREATE TRIGGER paper_assets_updated_at
    BEFORE UPDATE ON paper_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ingest_runs: finished_at + error_summary, allow success status
ALTER TABLE ingest_runs ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE ingest_runs ADD COLUMN IF NOT EXISTS error_summary TEXT;

ALTER TABLE ingest_runs DROP CONSTRAINT IF EXISTS ingest_runs_status_check;
ALTER TABLE ingest_runs ADD CONSTRAINT ingest_runs_status_check
    CHECK (status IN ('running', 'success', 'failed', 'completed', 'cancelled'));