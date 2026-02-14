-- B1 Rubric Extraction: vlm_ms_jobs, vlm_ms_runs, rubric_points
-- Idempotent migration – safe to re-run (IF NOT EXISTS / CREATE OR REPLACE)

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
