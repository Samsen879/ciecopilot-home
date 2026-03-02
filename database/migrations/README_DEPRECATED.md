This directory is deprecated and retained only as a pointer.

Rules:

1. Legacy SQL files were moved to `archive/database-legacy/migrations/`.
2. Canonical active migrations live in `supabase/migrations/` and are the only migrations used by runtime scripts and CI.
3. Do not add new migrations here.
4. Do not restore legacy files into this directory unless a documented recovery procedure explicitly requires it.
