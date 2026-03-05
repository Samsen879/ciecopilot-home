-- VLM Audit Log Tables
-- Migration: 20260201_audit_log_tables.sql
-- Based on: docs/compliance/audit_log_schema.md

-- 1. vlm_audit_logs_v0: Main audit log table (partitioned by month)
CREATE TABLE IF NOT EXISTS vlm_audit_logs_v0 (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relations (nullable for flexibility)
    run_id UUID,
    description_id UUID,
    storage_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    
    -- Event info
    event_type TEXT NOT NULL CHECK (event_type IN (
        'extraction_start', 'extraction_complete',
        'leakage_detected', 'leakage_blocked',
        'manual_review_required', 'manual_review_complete',
        'status_override', 'data_export', 'data_delete'
    )),
    event_severity TEXT NOT NULL CHECK (event_severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Risk assessment
    risk_score NUMERIC CHECK (risk_score >= 0 AND risk_score <= 10),
    risk_level TEXT CHECK (risk_level IN ('ok', 'warning', 'blocked')),
    
    -- Detection details
    triggered_rules TEXT[],
    leakage_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    affected_fields TEXT[],
    
    -- Context
    extractor_version TEXT,
    provider TEXT,
    model TEXT,
    prompt_version TEXT,
    
    -- Metadata
    actor TEXT DEFAULT 'system',
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Extension
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. vlm_audit_reviews_v0: Manual review records
CREATE TABLE IF NOT EXISTS vlm_audit_reviews_v0 (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES vlm_audit_logs_v0(log_id) ON DELETE CASCADE,
    
    -- Review info
    reviewer TEXT NOT NULL,
    review_action TEXT NOT NULL CHECK (review_action IN ('approve', 'reject', 'escalate', 'request_info')),
    review_reason TEXT,
    
    -- Status change
    original_status TEXT,
    new_status TEXT,
    
    -- Timestamps
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Extension
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 3. Indexes for vlm_audit_logs_v0
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON vlm_audit_logs_v0(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON vlm_audit_logs_v0(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON vlm_audit_logs_v0(event_severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON vlm_audit_logs_v0(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_run_id ON vlm_audit_logs_v0(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_description_id ON vlm_audit_logs_v0(description_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_storage_key ON vlm_audit_logs_v0(storage_key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type_severity ON vlm_audit_logs_v0(event_type, event_severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date_type ON vlm_audit_logs_v0(created_at, event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_leakage_flags ON vlm_audit_logs_v0 USING GIN (leakage_flags);
CREATE INDEX IF NOT EXISTS idx_audit_logs_triggered_rules ON vlm_audit_logs_v0 USING GIN (triggered_rules);

-- 4. Indexes for vlm_audit_reviews_v0
CREATE INDEX IF NOT EXISTS idx_audit_reviews_log_id ON vlm_audit_reviews_v0(log_id);
CREATE INDEX IF NOT EXISTS idx_audit_reviews_reviewer ON vlm_audit_reviews_v0(reviewer);
CREATE INDEX IF NOT EXISTS idx_audit_reviews_action ON vlm_audit_reviews_v0(review_action);
CREATE INDEX IF NOT EXISTS idx_audit_reviews_reviewed_at ON vlm_audit_reviews_v0(reviewed_at DESC);

-- 5. RLS Policies
ALTER TABLE vlm_audit_logs_v0 ENABLE ROW LEVEL SECURITY;
ALTER TABLE vlm_audit_reviews_v0 ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'vlm_audit_logs_v0'
          AND policyname = 'Service role full access on audit_logs'
    ) THEN
        CREATE POLICY "Service role full access on audit_logs" ON vlm_audit_logs_v0
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'vlm_audit_reviews_v0'
          AND policyname = 'Service role full access on audit_reviews'
    ) THEN
        CREATE POLICY "Service role full access on audit_reviews" ON vlm_audit_reviews_v0
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Allow authenticated users to read audit logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'vlm_audit_logs_v0'
          AND policyname = 'Authenticated read audit_logs'
    ) THEN
        CREATE POLICY "Authenticated read audit_logs" ON vlm_audit_logs_v0
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'vlm_audit_reviews_v0'
          AND policyname = 'Authenticated read audit_reviews'
    ) THEN
        CREATE POLICY "Authenticated read audit_reviews" ON vlm_audit_reviews_v0
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 6. Archive table (for long-term storage)
CREATE TABLE IF NOT EXISTS vlm_audit_logs_archive (
    LIKE vlm_audit_logs_v0 INCLUDING ALL
);

-- 7. Helper function: Create monthly partition
CREATE OR REPLACE FUNCTION create_audit_log_partition(partition_month DATE DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    target_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    target_date := COALESCE(partition_month, date_trunc('month', now() + interval '1 month'));
    partition_name := 'vlm_audit_logs_v0_' || to_char(target_date, 'YYYY_MM');
    start_date := target_date;
    end_date := target_date + interval '1 month';
    
    -- Note: Partitioning requires the main table to be created as partitioned
    -- This function is for documentation; actual partitioning setup depends on deployment
    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- 8. Helper function: Archive old logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS TABLE(archived_count INT, deleted_count INT) AS $$
DECLARE
    arch_count INT := 0;
    del_count INT := 0;
BEGIN
    -- Archive critical/error events older than 1 year
    WITH archived AS (
        INSERT INTO vlm_audit_logs_archive
        SELECT * FROM vlm_audit_logs_v0
        WHERE event_severity IN ('critical', 'error')
          AND created_at < now() - interval '1 year'
        RETURNING 1
    )
    SELECT COUNT(*) INTO arch_count FROM archived;
    
    -- Delete archived records
    DELETE FROM vlm_audit_logs_v0
    WHERE event_severity IN ('critical', 'error')
      AND created_at < now() - interval '1 year';
    
    -- Delete old warning events
    DELETE FROM vlm_audit_logs_v0
    WHERE event_severity = 'warning'
      AND created_at < now() - interval '1 year';
    GET DIAGNOSTICS del_count = ROW_COUNT;
    
    -- Delete old info events
    DELETE FROM vlm_audit_logs_v0
    WHERE event_severity = 'info'
      AND created_at < now() - interval '90 days';
    
    RETURN QUERY SELECT arch_count, del_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Comments
COMMENT ON TABLE vlm_audit_logs_v0 IS 'VLM extraction audit logs for compliance tracking';
COMMENT ON TABLE vlm_audit_reviews_v0 IS 'Manual review records for audit logs';
COMMENT ON TABLE vlm_audit_logs_archive IS 'Long-term archive for critical/error audit events';
