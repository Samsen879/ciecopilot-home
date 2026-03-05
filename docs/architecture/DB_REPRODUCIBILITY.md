This document defines the stability, reproducibility, and verification guarantees of the CIE‑Copilot backend data layer. It serves as a human‑auditable contract between schema design, migrations, and AI‑facing retrieval logic.

The goal is not velocity, but deterministic correctness under repeated replay, local verification, and future extension.

1. Reproducible Database Baseline

Guarantee: The database schema can be replayed from an empty state using a single command without manual intervention.

All Supabase migrations are idempotent and order‑safe

No migration assumes implicit prior state

supabase db reset succeeds from zero on a clean environment

This ensures:

Onboarding does not depend on tribal knowledge

CI and local environments are structurally equivalent

Historical drift is eliminated

Migration version discipline (enforced)

Only unique numeric prefixes are allowed in supabase/migrations. Any duplicate prefix is resolved by renaming the later file to a new unique timestamp.

Deprecated: 20260131235000_allow_duplicate_migration_versions.sql temporarily relaxed the schema_migrations PK to (version, name). This behavior is NOT relied upon and is reverted by 20260202173030_restore_schema_migrations_pk.sql.

2. Canonical Schema Invariants

Certain schema properties are treated as non‑negotiable invariants. These are explicitly verified, not assumed.

Enforced invariants

curriculum_nodes.topic_path is of type ltree

chunks.embedding is of type vector(1536)

GIST index exists on curriculum_nodes.topic_path

These invariants are verified via verify_schema.sql and will fail loudly if violated.

3. Read‑Only Knowledge Boundary

curriculum_nodes represents the authoritative syllabus graph and is treated as immutable at runtime.

Guarantees:

Row Level Security (RLS) enabled

INSERT / UPDATE / DELETE revoked for anon and authenticated

Explicit SELECT policy enforced

This prevents:

Silent syllabus drift

Accidental mutation via API or admin tooling

AI agents hallucinating or altering knowledge structure

4. Guarded Retrieval Interface

The primary retrieval entrypoint (hybrid_search_v2) is guarded by hard preconditions.

Required constraints

p_topic_path must be provided

Empty or unknown topic paths are rejected

Verification

verify_search_guardrail.sql includes:

Negative cases (missing / invalid topic path)

Positive case asserting zero leakage outside syllabus scope

This ensures:

Retrieval is always syllabus‑scoped

No cross‑topic leakage is possible

Violations are observable, not silent

5. View Migration Safety

Historical migrations involving SQL VIEWs are structured to avoid PostgreSQL rewrite hazards.

Policy:

No migration relies on CREATE OR REPLACE VIEW to change column order or names

Structural changes are introduced via insert‑style or guard migrations

This guarantees:

Forward compatibility

Safe replay from zero

No environment‑specific divergence

6. Human‑Runnable Verification

All guarantees above are verifiable by non‑experts via a single command.

PowerShell runner: scripts/db/run_verify.ps1

Documentation: docs/setup/LOCAL_DB_VERIFY.md

The system is considered valid only if verification passes.

7. Design Philosophy

This project intentionally prioritizes:

Explicit constraints over implicit convention

Verifiable invariants over optimistic assumptions

Reproducibility over speed

Failures are expected to be early, loud, and inspectable.

This forms the foundation for syllabus‑aligned AI behavior and prevents silent correctness degradation over time.
