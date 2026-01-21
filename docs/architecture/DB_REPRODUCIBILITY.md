# Database Reproducibility Guarantees

## Purpose

This document defines the architectural invariants that ensure database correctness is provable and reproducible. These guarantees are foundational—not optional—because the system's search and recommendation logic depends on schema-level constraints that cannot be verified at runtime alone.

## Definition

**Database reproducibility** means: running `supabase db reset` from a clean state produces a schema that passes all verification checks without manual intervention.

This is the single source of truth for local development and CI validation.

## Schema Invariants

The following invariants must hold after any migration sequence:

| Invariant | Verification |
|-----------|--------------|
| `ltree` extension enabled | `pg_extension` |
| `vector` extension enabled | `pg_extension` |
| `curriculum_nodes.topic_path` is `ltree` | `information_schema.columns` |
| `chunks.embedding` is `vector(1536)` | `pg_attribute` + `format_type` |
| `idx_curriculum_nodes_topic_path_gist` exists | `pg_indexes` |
| `idx_curriculum_nodes_syllabus_code` exists | `pg_indexes` |
| `chk_topic_path_canonical` constraint exists | `pg_constraint` |
| `chk_topic_path_not_unmapped` constraint exists | `pg_constraint` |

Verification scripts: `scripts/db/verify_schema.sql`

## Read-Only Guardrails

`curriculum_nodes` is a read-only reference table. The following enforcement is applied:

- RLS enabled with SELECT-only policy for `anon` and `authenticated` roles
- `INSERT`, `UPDATE`, `DELETE` privileges revoked from `anon` and `authenticated`
- Write policies explicitly dropped if they exist

This prevents accidental mutation of syllabus structure by application code.

Migration: `supabase/migrations/20260120073556_curriculum_nodes_read_only.sql`

## Search Boundary Enforcement

`hybrid_search_v2` enforces syllabus-scoped search via the `p_topic_path ltree` parameter.

### Negative Cases (must error)

| Input | Expected |
|-------|----------|
| `p_topic_path = NULL` | Error: `current_topic_path required` |
| `p_topic_path = ''` | Error: `unknown current_topic_path` |

### Positive Case

| Input | Expected |
|-------|----------|
| Valid `p_topic_path` | `leakage_count = 0` (no results outside syllabus boundary) |

Verification script: `scripts/db/verify_search_guardrail.sql`

## Non-Goals

This document does NOT cover:

- Application-level business logic
- Frontend state management
- API endpoint design
- Performance tuning or indexing strategy beyond correctness
- Deployment or CI/CD pipeline configuration

## Conclusion

Database reproducibility is a foundational guarantee, not a convenience feature. Without it, schema drift becomes undetectable, search correctness becomes unprovable, and local/CI environments diverge silently.

All migrations must preserve these invariants. All verification must pass before merge.
