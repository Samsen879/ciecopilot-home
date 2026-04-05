import fs from 'fs';
import path from 'path';

const LEARNING_RUNTIME_MIGRATIONS = [
  'supabase/migrations/20260320110000_expand_question_bank_for_learning_runtime.sql',
  'supabase/migrations/20260320111000_create_learning_runtime_core.sql',
  'supabase/migrations/20260320111500_seed_learning_runtime_pilot_registry.sql',
  'supabase/migrations/20260320112000_create_learning_runtime_read_models.sql'
];

function readMigration(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8').toLowerCase();
}

function readLearningRuntimeMigrations() {
  return LEARNING_RUNTIME_MIGRATIONS
    .map((relPath) => readMigration(relPath))
    .join('\n');
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function extractTableBlock(sql, tableName) {
  const startToken = `create table if not exists ${tableName}`;
  const startIndex = sql.indexOf(startToken);

  if (startIndex === -1) {
    throw new Error(`Missing table block for ${tableName}`);
  }

  const nextBlockTokens = [
    '\ncreate table if not exists public.',
    '\ncreate or replace view public.',
    '\ncreate view public.',
    '\ninsert into public.',
    '\nalter table public.',
    '\ncreate index if not exists',
    '\ncreate unique index if not exists',
    '\ndrop view if exists public.'
  ];

  const endIndex = nextBlockTokens
    .map((token) => sql.indexOf(token, startIndex + startToken.length))
    .filter((index) => index !== -1)
    .sort((a, b) => a - b)[0];

  return sql.slice(startIndex, endIndex === undefined ? sql.length : endIndex);
}

describe('learning runtime schema contract', () => {
  test('learning runtime migrations declare every frozen canonical table and invariant', () => {
    const sql = readLearningRuntimeMigrations();

    [
      'source_kind',
      'subject_code',
      'paper_scope',
      'primary_topic_id',
      'secondary_topic_ids',
      'family_id',
      'primary_question_type_id',
      'secondary_question_type_ids',
      'variant_tags',
      'release_scope_status',
      'classification_snapshot_ref',
      'prompt_representation',
      'provenance_summary'
    ].forEach((token) => expect(sql).toContain(token));

    expect(sql).toContain('alter column storage_key drop not null');
    expect(sql).toContain('alter column q_number drop not null');
    expect(sql).toContain('unique (storage_key, q_number)');
    expect(sql).toContain('where storage_key is not null and q_number is not null');
    expect(sql).toContain('create table if not exists public.learning_question_families');
    expect(sql).toContain('create table if not exists public.learning_question_types');
    expect(sql).toContain('create table if not exists public.learning_question_analysis_snapshots');
    expect(sql).toContain('create table if not exists public.learning_sessions');
    expect(sql).toContain('create table if not exists public.learning_session_lineage');
    expect(sql).toContain('create table if not exists public.learning_workspaces');
    expect(sql).toContain('create table if not exists public.learning_workspace_slots');
    expect(sql).toContain('create table if not exists public.learning_artifacts');
    expect(sql).toContain('create table if not exists public.learning_artifact_secondary_refs');
    expect(sql).toContain('create table if not exists public.learning_review_tasks');
    expect(sql).toContain('create table if not exists public.learning_family_masteries');
    expect(sql).toContain('create table if not exists public.learning_type_masteries');
    expect(sql).toContain('create table if not exists public.learning_reconciliation_runs');
    expect(sql).toContain('unique (user_id, topic_id)');
    expect(sql).toContain('unique (workspace_id, slot_key)');
    expect(sql).toContain("check (mode in ('learn_concept', 'guided_solve', 'timed_practice', 'post_mortem_review', 'spaced_review'))");
    expect(sql).toContain("check (state in ('active', 'handoff_suggested', 'handed_off', 'closed'))");
    expect(sql).toContain("check (current_anchor_kind in ('concept', 'question', 'review_task', 'artifact', 'workspace_slot'))");
    expect(sql).toContain("check (slot_key in ('overview_map', 'core_method_derivation', 'canonical_worked_example', 'common_traps', 'my_notes', 'review_queue'))");
    expect(sql).toContain('references public.learning_question_families');
    expect(sql).toContain('9709.trigonometry_manipulation_equations');
    expect(sql).toContain('9709.trigonometry.identities');
    expect(sql).toContain('9709.trigonometry.equations');

    [
      'user_id',
      'session_goal',
      'mode',
      'state',
      'active_scope_bundle',
      'current_anchor_kind',
      'current_anchor_ref',
      'current_question_id',
      'current_question_type_id',
      'summary_state',
      'open_questions',
      'key_artifact_refs',
      'misconceptions_in_focus',
      'lineage_ref'
    ].forEach((token) => expect(sql).toContain(token));

    [
      'family_id',
      'title',
      'description',
      'release_state',
      'created_at',
      'updated_at',
      'allowed_variant_tags',
      'default_primary_topic_id',
      'parent_session_id',
      'child_session_id',
      'handoff_kind',
      'summary_snapshot',
      'workspace_id',
      'slot_key',
      'primary_artifact_ref',
      'linked_reference_refs',
      'status',
      'trigger_source',
      'source_ref',
      'affected_object_refs',
      'result_summary',
      'started_at',
      'completed_at'
    ].forEach((token) => expect(sql).toContain(token));

    const lineageSql = extractTableBlock(sql, 'public.learning_session_lineage');
    [
      'parent_session_id',
      'child_session_id',
      'handoff_kind',
      'summary_snapshot',
      'created_at'
    ].forEach((token) => expect(lineageSql).toContain(token));

    const sessionsSql = extractTableBlock(sql, 'public.learning_sessions');
    [
      "check (mode in ('learn_concept', 'guided_solve', 'timed_practice', 'post_mortem_review', 'spaced_review'))",
      "check (state in ('active', 'handoff_suggested', 'handed_off', 'closed'))",
      "check (current_anchor_kind in ('concept', 'question', 'review_task', 'artifact', 'workspace_slot'))"
    ].forEach((token) => expect(sessionsSql).toContain(token));

    const workspacesSql = extractTableBlock(sql, 'public.learning_workspaces');
    ['user_id', 'topic_id', 'unique (user_id, topic_id)']
      .forEach((token) => expect(workspacesSql).toContain(token));

    const workspaceSlotsSql = extractTableBlock(sql, 'public.learning_workspace_slots');
    [
      'workspace_id',
      'slot_key',
      'primary_artifact_ref',
      'linked_reference_refs',
      'updated_at',
      'unique (workspace_id, slot_key)'
    ].forEach((token) => expect(workspaceSlotsSql).toContain(token));

    const questionTypesSql = extractTableBlock(sql, 'public.learning_question_types');
    ['family_id', 'references public.learning_question_families']
      .forEach((token) => expect(questionTypesSql).toContain(token));

    const reconciliationSql = extractTableBlock(sql, 'public.learning_reconciliation_runs');
    [
      'trigger_source',
      'source_ref',
      'affected_object_refs',
      'status',
      'result_summary',
      'started_at',
      'completed_at'
    ].forEach((token) => expect(reconciliationSql).toContain(token));
  });

  test('pilot registry seed remains insert-only and idempotent', () => {
    const sql = normalizeSql(readMigration(
      'supabase/migrations/20260320111500_seed_learning_runtime_pilot_registry.sql'
    ));

    expect(sql).toContain('on conflict (family_id) do nothing');
    expect(sql).toContain('on conflict (question_type_id) do nothing');
  });

  test('question_bank keeps a compatibility arbiter for legacy storage key upserts', () => {
    const sql = normalizeSql(readMigration(
      'supabase/migrations/20260320110000_expand_question_bank_for_learning_runtime.sql'
    ));

    expect(sql).toContain('add constraint uq_question_bank_storage_q unique (storage_key, q_number)');
    expect(sql).toContain(
      'create unique index if not exists uq_question_bank_storage_q_present on public.question_bank (storage_key, q_number) where storage_key is not null and q_number is not null'
    );
  });
});
