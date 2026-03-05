-- B1 Rubric Extraction: vlm_ms_jobs, vlm_ms_runs, rubric_points
-- Idempotent migration – safe to re-run (IF NOT EXISTS / CREATE OR REPLACE)
-- Includes compatibility ALTERs for environments where rubric_points already exists
-- with older column contracts.

-- ============================================================
-- 1. vlm_ms_jobs – MS extraction job queue
-- ============================================================
CREATE TABLE IF NOT EXISTS vlm_ms_jobs (
    job_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key       TEXT NOT NULL,
    sha256            TEXT NOT NULL,
    paper_id          UUID,
    syllabus_code     TEXT NOT NULL,
    session           TEXT NOT NULL,
    year              INT  NOT NULL,
    paper             INT  NOT NULL,
    variant           INT  NOT NULL,
    q_number          INT  NOT NULL,
    subpart           TEXT,
    extractor_version TEXT NOT NULL,
    provider          TEXT NOT NULL,
    model             TEXT NOT NULL,
    prompt_version    TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','done','error')),
    attempts          INT  NOT NULL DEFAULT 0,
    last_error        TEXT,
    locked_by         TEXT,
    locked_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now(),
    UNIQUE (storage_key, sha256, extractor_version, provider, model, prompt_version)
);

CREATE INDEX IF NOT EXISTS idx_vlm_ms_jobs_status_locked
    ON vlm_ms_jobs(status, locked_at);


-- ============================================================
-- 2. vlm_ms_runs – run audit records
-- ============================================================
CREATE TABLE IF NOT EXISTS vlm_ms_runs (
    run_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at    TIMESTAMPTZ,
    status         TEXT NOT NULL CHECK (status IN ('running','success','failed')),
    config         JSONB NOT NULL DEFAULT '{}'::jsonb,
    counts         JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_summary  TEXT
);

-- ============================================================
-- 3. rubric_points – structured rubric data
-- ============================================================
CREATE TABLE IF NOT EXISTS rubric_points (
    rubric_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key           TEXT NOT NULL,
    paper_id              UUID,
    q_number              INT  NOT NULL,
    subpart               TEXT,
    step_index            INT  NOT NULL,
    -- core content
    mark_label            TEXT NOT NULL,
    kind                  TEXT NOT NULL CHECK (kind IN ('M','A','B')),
    description           TEXT NOT NULL,
    marks                 INT  NOT NULL CHECK (marks > 0),
    depends_on_labels     TEXT[] NOT NULL DEFAULT '{}',
    depends_on            UUID[] NOT NULL DEFAULT '{}',
    ft_mode               TEXT NOT NULL DEFAULT 'none'
                          CHECK (ft_mode IN ('none','follow_through','carried_accuracy','unknown')),
    expected_answer_latex  TEXT,
    -- quality & status
    confidence            NUMERIC NOT NULL DEFAULT 0.0
                          CHECK (confidence >= 0.0 AND confidence <= 1.0),
    confidence_source     TEXT NOT NULL DEFAULT 'model'
                          CHECK (confidence_source IN ('model','heuristic','manual')),
    status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','ready','needs_review')),
    parse_flags           JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- audit & versioning
    source                TEXT NOT NULL DEFAULT 'vlm',
    run_id                UUID REFERENCES vlm_ms_runs(run_id) ON DELETE SET NULL,
    extractor_version     TEXT NOT NULL,
    provider              TEXT NOT NULL,
    model                 TEXT NOT NULL,
    prompt_version        TEXT NOT NULL,
    raw_json              JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_sha256       TEXT,
    point_fingerprint     TEXT NOT NULL,
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now(),
    -- ready data must satisfy publishable label constraint
    CONSTRAINT chk_rp_mark_label_ready
        CHECK (status <> 'ready' OR mark_label ~ '^[MAB][0-9]+$')
);

-- Compatibility: ensure required v1 columns exist even if rubric_points pre-existed.
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS rubric_id UUID;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS paper_id UUID;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS q_number INT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS subpart TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS step_index INT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS mark_label TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS marks INT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS depends_on_labels TEXT[];
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS depends_on UUID[];
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS ft_mode TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS expected_answer_latex TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS confidence NUMERIC;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS confidence_source TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS parse_flags JSONB;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS run_id UUID;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS extractor_version TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS prompt_version TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS raw_json JSONB;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS response_sha256 TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS point_fingerprint TEXT;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE rubric_points ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Safe defaults for legacy rows; this keeps downstream indexes/views operable.
UPDATE rubric_points SET storage_key = '' WHERE storage_key IS NULL;
UPDATE rubric_points SET rubric_id = gen_random_uuid() WHERE rubric_id IS NULL;
UPDATE rubric_points SET q_number = 0 WHERE q_number IS NULL;
UPDATE rubric_points SET step_index = 0 WHERE step_index IS NULL;
UPDATE rubric_points SET mark_label = 'M0' WHERE mark_label IS NULL;
UPDATE rubric_points SET kind = 'M' WHERE kind IS NULL;
UPDATE rubric_points SET description = '' WHERE description IS NULL;
UPDATE rubric_points SET marks = 1 WHERE marks IS NULL;
UPDATE rubric_points SET depends_on_labels = '{}'::text[] WHERE depends_on_labels IS NULL;
UPDATE rubric_points SET depends_on = '{}'::uuid[] WHERE depends_on IS NULL;
UPDATE rubric_points SET ft_mode = 'none' WHERE ft_mode IS NULL;
UPDATE rubric_points SET confidence = 0.0 WHERE confidence IS NULL;
UPDATE rubric_points SET confidence_source = 'model' WHERE confidence_source IS NULL;
UPDATE rubric_points SET status = 'draft' WHERE status IS NULL;
UPDATE rubric_points SET parse_flags = '{}'::jsonb WHERE parse_flags IS NULL;
UPDATE rubric_points SET source = 'vlm' WHERE source IS NULL;
UPDATE rubric_points SET extractor_version = 'legacy' WHERE extractor_version IS NULL;
UPDATE rubric_points SET provider = 'legacy' WHERE provider IS NULL;
UPDATE rubric_points SET model = 'legacy' WHERE model IS NULL;
UPDATE rubric_points SET prompt_version = 'legacy' WHERE prompt_version IS NULL;
UPDATE rubric_points SET raw_json = '{}'::jsonb WHERE raw_json IS NULL;
UPDATE rubric_points SET point_fingerprint = md5(coalesce(mark_label,'') || ':' || coalesce(description,'') || ':' || coalesce(marks::text,'')) WHERE point_fingerprint IS NULL;
UPDATE rubric_points SET created_at = now() WHERE created_at IS NULL;
UPDATE rubric_points SET updated_at = now() WHERE updated_at IS NULL;

ALTER TABLE rubric_points ALTER COLUMN storage_key SET DEFAULT '';
ALTER TABLE rubric_points ALTER COLUMN rubric_id SET DEFAULT gen_random_uuid();
ALTER TABLE rubric_points ALTER COLUMN q_number SET DEFAULT 0;
ALTER TABLE rubric_points ALTER COLUMN step_index SET DEFAULT 0;
ALTER TABLE rubric_points ALTER COLUMN mark_label SET DEFAULT 'M0';
ALTER TABLE rubric_points ALTER COLUMN kind SET DEFAULT 'M';
ALTER TABLE rubric_points ALTER COLUMN description SET DEFAULT '';
ALTER TABLE rubric_points ALTER COLUMN marks SET DEFAULT 1;
ALTER TABLE rubric_points ALTER COLUMN depends_on_labels SET DEFAULT '{}';
ALTER TABLE rubric_points ALTER COLUMN depends_on SET DEFAULT '{}';
ALTER TABLE rubric_points ALTER COLUMN ft_mode SET DEFAULT 'none';
ALTER TABLE rubric_points ALTER COLUMN confidence SET DEFAULT 0.0;
ALTER TABLE rubric_points ALTER COLUMN confidence_source SET DEFAULT 'model';
ALTER TABLE rubric_points ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE rubric_points ALTER COLUMN parse_flags SET DEFAULT '{}'::jsonb;
ALTER TABLE rubric_points ALTER COLUMN source SET DEFAULT 'vlm';
ALTER TABLE rubric_points ALTER COLUMN extractor_version SET DEFAULT 'legacy';
ALTER TABLE rubric_points ALTER COLUMN provider SET DEFAULT 'legacy';
ALTER TABLE rubric_points ALTER COLUMN model SET DEFAULT 'legacy';
ALTER TABLE rubric_points ALTER COLUMN prompt_version SET DEFAULT 'legacy';
ALTER TABLE rubric_points ALTER COLUMN raw_json SET DEFAULT '{}'::jsonb;
ALTER TABLE rubric_points ALTER COLUMN point_fingerprint SET DEFAULT md5('legacy');
ALTER TABLE rubric_points ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE rubric_points ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE rubric_points ALTER COLUMN storage_key SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN rubric_id SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN q_number SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN step_index SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN mark_label SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN kind SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN description SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN marks SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN depends_on_labels SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN depends_on SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN ft_mode SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN confidence SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN confidence_source SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN status SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN parse_flags SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN source SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN extractor_version SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN provider SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN model SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN prompt_version SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN raw_json SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN point_fingerprint SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE rubric_points ALTER COLUMN updated_at SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rp_storage_status
    ON rubric_points(storage_key, q_number, subpart, status);

CREATE INDEX IF NOT EXISTS idx_rp_fingerprint
    ON rubric_points(point_fingerprint);

-- Expression unique index for idempotent upsert (COALESCE handles NULL subpart)
CREATE UNIQUE INDEX IF NOT EXISTS uq_rp_scope_fingerprint_version
    ON rubric_points(
        storage_key,
        q_number,
        COALESCE(subpart, ''),
        point_fingerprint,
        extractor_version,
        provider,
        model,
        prompt_version
    );

-- ============================================================
-- 4. rubric_points_ready_v1 – read-only publishing view
-- ============================================================
CREATE OR REPLACE VIEW rubric_points_ready_v1 AS
SELECT
    rubric_id, storage_key, paper_id, q_number, subpart, step_index,
    mark_label, kind, description, marks,
    depends_on, ft_mode, expected_answer_latex,
    confidence, source, run_id, extractor_version,
    provider, model, prompt_version,
    concat_ws(':', extractor_version, provider, model, prompt_version) AS source_version
FROM rubric_points
WHERE status = 'ready';
