# Learning Event Pipeline Gate

- status: `pass`
- phase0_ready: `true`
- generated_at: `2026-04-14T08:35:23.495Z`
- migration_path: `supabase/migrations/20260412090000_phase0_learning_events_core.sql`

## Gates

### migration_contract
- status: `pass`
- checked_path: `"supabase/migrations/20260412090000_phase0_learning_events_core.sql"`
- required_tokens: `["create table if not exists public.learning_events","create table if not exists public.learning_event_effects","create table if not exists public.attempt_pipeline_state","unique (aggregate_id, truth_revision, sequence_no)","unique (aggregate_id, truth_revision, event_type)","unique (event_type, dedupe_key)","unique (handler_name, effect_key)","attemptsubmitted","artifactsuggestionscreated"]`
- missing_tokens: `[]`

### ordered_pipeline
- status: `pass`
- inserted_count: `7`
- final_stage: `"ArtifactSuggestionsCreated"`
- final_status: `"completed"`
- last_sequence_no: `7`

### replay_revision
- status: `pass`
- inserted_count: `7`
- current_truth_revision: `2`
- final_stage: `"ArtifactSuggestionsCreated"`
- final_status: `"completed"`
- last_sequence_no: `7`
- event_count: `14`

### dedupe_guard
- status: `pass`
- first_inserted: `true`
- duplicate_inserted: `false`
- duplicate_reason_code: `"duplicate_dedupe_key"`

### effect_idempotency
- status: `pass`
- first_inserted: `true`
- completed_status: `"succeeded"`
- replay_inserted: `false`
- replay_reason_code: `"duplicate_effect_key"`
- effect_count: `1`

### attempt_stream_lock
- status: `pass`
- first_acquired: `true`
- second_acquired: `false`
- second_reason_code: `"attempt_stream_locked"`
- released: `true`
- third_acquired: `true`

### out_of_order_guard
- status: `pass`
- error_code: `"out_of_order_event"`
