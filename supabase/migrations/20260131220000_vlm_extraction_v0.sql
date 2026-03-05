-- VLM Extraction v0 Tables
-- Migration: 20260131220000_vlm_extraction_v0.sql

-- 1. question_descriptions_v0: 存储 VLM 提取结果
CREATE TABLE IF NOT EXISTS question_descriptions_v0 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    syllabus_code TEXT NOT NULL,
    session TEXT NOT NULL CHECK (session IN ('s', 'w', 'm')),
    year INT NOT NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('qp')),
    paper INT NOT NULL,
    variant INT NOT NULL,
    q_number INT NOT NULL,
    subpart TEXT,
    status TEXT NOT NULL CHECK (status IN ('ok', 'blocked', 'error')),
    confidence NUMERIC,
    summary TEXT,
    question_type TEXT,
    answer_form TEXT,
    math_expressions_latex TEXT[],
    variables TEXT[],
    units TEXT[],
    leakage_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    extractor_version TEXT NOT NULL,
    response_sha256 TEXT,
    raw_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(storage_key, sha256, extractor_version, provider, model, prompt_version)
);

-- 2. vlm_jobs_v0: 任务队列
CREATE TABLE IF NOT EXISTS vlm_jobs_v0 (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    syllabus_code TEXT NOT NULL,
    session TEXT NOT NULL,
    year INT NOT NULL,
    doc_type TEXT NOT NULL,
    paper INT NOT NULL,
    variant INT NOT NULL,
    q_number INT NOT NULL,
    subpart TEXT,
    extractor_version TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'blocked', 'error')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    locked_by TEXT,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(storage_key, sha256, extractor_version, provider, model, prompt_version)
);

-- 3. vlm_runs_v0: 运行记录
CREATE TABLE IF NOT EXISTS vlm_runs_v0 (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    input_fingerprint TEXT,
    error_summary TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qd_v0_storage_key ON question_descriptions_v0(storage_key);
CREATE INDEX IF NOT EXISTS idx_vlm_jobs_status_locked ON vlm_jobs_v0(status, locked_at);
CREATE INDEX IF NOT EXISTS idx_vlm_jobs_paper ON vlm_jobs_v0(syllabus_code, year, session, paper, variant);
