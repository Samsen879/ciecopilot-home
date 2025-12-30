# Test Fixtures for Syllabus Boundary System

## Overview

This directory contains test fixtures for the syllabus boundary system CI tests.

## Files

| File | Purpose |
|------|---------|
| `supabase-shims.sql` | Stubs for Supabase auth functions (auth.role(), auth.uid(), auth.jwt()) |
| `syllabus_boundary_seed.sql` | Full deterministic seed (123 chunks, 36 nodes, 15 unmapped) |
| `syllabus_boundary_seed_minimal.sql` | Minimal seed for quick tests (20 chunks, 10 nodes) |
| `init-test-db.sql` | Docker init script (creates final schema directly, NOT for replay) |

## CI Database Setup Order (CRITICAL)

The CI pipeline MUST execute steps in this exact order:

```
1. Create Supabase roles (anon, authenticated)
2. Reset to baseline (old schema without ltree/topic_path)
3. Apply supabase-shims.sql (REQUIRED for RLS policies)
4. Replay migrations in order:
   - 20251223000100_enable_ltree.sql
   - 20251223000200_chunks_add_topic_path_fts.sql
   - 20251223000300_create_curriculum_nodes.sql
   - 20251223000400_rpc_hybrid_search_v2.sql
5. Seed deterministic test data
6. Run tests
```

**WARNING**: Changing this order will cause migration replay failures.

## supabase-shims.sql

This file creates stub functions for Supabase auth schema:

```sql
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text ...;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid ...;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb ...;
```

**Purpose**: Allow RLS policies that reference `auth.role()` to be created in vanilla PostgreSQL (without full Supabase).

**Important**: 
- These are TEST-ONLY stubs
- Do NOT copy into production migrations
- The stubs return fixed values ('authenticated', null UUID, empty JSON)

## Deterministic Embeddings

The seed data uses 2D direction vectors for embeddings to ensure:
- Deterministic ranking (no random variation)
- Avoidance of cosine ties (each topic has unique direction)
- Stable tie-breaker verification (ORDER BY score DESC, id ASC)

Direction assignments:
```
9709.p1.quadratics:   [1.0, 0.0]
9709.p1.functions:    [0.7, 0.7]
9709.p3.trig:         [-0.5, 0.866]
9702.as.mechanics:    [-0.866, -0.5]
9702.as.waves:        [-0.7, -0.7]
9231.p1.complex:      [0.866, -0.5]
... (see seed file for full list)
```

## Required Check Setup

To make the leakage tests a required CI gate:

1. Go to GitHub repo Settings > Branches
2. Edit branch protection rule for `main`
3. Enable "Require status checks to pass before merging"
4. Add check: `syllabus-boundary-leakage-gate`

The check name is the **job name** in the workflow YAML, not the file name.
