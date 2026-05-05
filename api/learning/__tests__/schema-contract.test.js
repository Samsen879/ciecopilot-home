import fs from 'fs';
import path from 'path';

const LEARNING_QUESTION_SEARCH_MIGRATION =
  'supabase/migrations/20260415152950_create_learning_question_search_projection.sql';
const DRAFT_9709_P1_CLASSIFIER_REGISTRY_MIGRATION =
  'supabase/migrations/20260504160000_seed_9709_p1_classifier_registry_draft.sql';
const DRAFT_9709_P3_CLASSIFIER_REGISTRY_MIGRATION =
  'supabase/migrations/20260505120000_seed_9709_p3_classifier_registry_draft.sql';

const LEARNING_RUNTIME_MIGRATIONS = [
  'supabase/migrations/20260320110000_expand_question_bank_for_learning_runtime.sql',
  'supabase/migrations/20260320111000_create_learning_runtime_core.sql',
  'supabase/migrations/20260320111500_seed_learning_runtime_pilot_registry.sql',
  'supabase/migrations/20260320112000_create_learning_runtime_read_models.sql',
  'supabase/migrations/20260324110000_promote_learning_runtime_integration_application.sql',
  'supabase/migrations/20260412103000_expand_learning_question_analysis_snapshots_phase_a.sql',
  'supabase/migrations/20260417110000_create_learning_event_deliveries.sql',
  'supabase/migrations/20260417120000_create_learning_runtime_effect_receipts.sql',
  'supabase/migrations/20260413110000_phase_a_question_classified_events.sql',
  LEARNING_QUESTION_SEARCH_MIGRATION
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
      'prerequisite_topic_ids',
      'family_id',
      'primary_question_type_id',
      'secondary_question_type_ids',
      'variant_tags',
      'canonical_step_skeleton_summary',
      'difficulty_signal',
      'confidence_band',
      'low_confidence_posture',
      'analysis_audit_metadata',
      'analysis_version',
      'evidence_source_event_ref',
      'analysis_provenance_kind',
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
    expect(sql).toContain('create table if not exists public.learning_question_events');
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
    expect(sql).toContain('create table if not exists public.learning_event_deliveries');
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

    const artifactSql = extractTableBlock(sql, 'public.learning_artifacts');
    [
      'artifact_state',
      'verified_by',
      'verified_at',
      'verification_evidence_ref',
      'released_by',
      'released_at',
      'release_evidence_ref',
      'contested_by',
      'contested_at',
      'contested_reason',
      'superseded_by_artifact_id',
      'superseded_at',
    ].forEach((token) => expect(artifactSql).toContain(token));
    expect(artifactSql).toContain(
      "check (artifact_state in ('unverified', 'verified', 'released', 'contested', 'superseded'))"
    );

    const questionAnalysisSql = normalizeSql(readMigration(
      'supabase/migrations/20260413110000_phase_a_question_classified_events.sql'
    ));
    [
      'low_confidence_posture',
      'create table if not exists public.learning_question_events',
      'question_event_id uuid primary key default gen_random_uuid()',
      'classification_snapshot_id uuid not null references public.learning_question_analysis_snapshots(classification_snapshot_id)',
      "check (low_confidence_posture is null or jsonb_typeof(low_confidence_posture) = 'object')"
    ].forEach((token) => expect(questionAnalysisSql).toContain(token));

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

    const deliverySql = normalizeSql(extractTableBlock(sql, 'public.learning_event_deliveries'));
    [
      'stable_idempotency_key',
      'attempt_id',
      'mark_run_id',
      'delivery_state',
      'retry_count',
      'last_attempted_at',
      'last_error',
      "delivery_state in ('pending', 'persisted', 'retrying', 'reconciled', 'needs_manual_review')",
      'unique (stable_idempotency_key)'
    ].forEach((token) => expect(deliverySql).toContain(token));

    const effectReceiptSql = normalizeSql(readMigration(
      'supabase/migrations/20260417120000_create_learning_runtime_effect_receipts.sql'
    ));

    [
      'alter table public.learning_event_effects',
      'proposal_key',
      'receipt_state',
      "receipt_state in ('pending', 'persisted', 'retrying', 'reconciled', 'needs_manual_review')",
      'retry_count',
      'last_attempted_at',
      'last_error',
      'completed_at',
      'idx_learning_event_effects_proposal_receipt',
      'idx_learning_event_effects_retry_attention'
    ].forEach((token) => expect(effectReceiptSql).toContain(token));

    const registryProjectionSql = normalizeSql(readMigration(
      'supabase/migrations/20260413110000_phase_a_question_classified_events.sql'
    ));

    [
      'lqas.prerequisite_topic_ids',
      'lqas.canonical_step_skeleton_summary',
      'lqas.difficulty_signal',
      'lqas.confidence_band',
      'lqas.low_confidence_posture',
      'lqas.analysis_audit_metadata',
      'lqas.analysis_version',
      'lqas.evidence_source_event_ref',
      'lqas.analysis_provenance_kind'
    ].forEach((token) => expect(registryProjectionSql).toContain(token));

    expect(registryProjectionSql).toContain(
      'qb.provenance_summary, lqas.classification_confidence, lqas.candidate_rubric_refs, lqt.release_state as primary_question_type_release_state, lqas.classification_source, lqas.confidence_band'
    );
  });

  test('pilot registry seed remains insert-only and idempotent', () => {
    const sql = normalizeSql(readMigration(
      'supabase/migrations/20260320111500_seed_learning_runtime_pilot_registry.sql'
    ));

    expect(sql).toContain('on conflict (family_id) do nothing');
    expect(sql).toContain('on conflict (question_type_id) do nothing');
  });

  test('9709 p1 classifier registry draft seed covers non-released topic families', () => {
    const migrationPath = path.join(process.cwd(), DRAFT_9709_P1_CLASSIFIER_REGISTRY_MIGRATION);
    const migrationExists = fs.existsSync(migrationPath);

    expect(migrationExists).toBe(true);
    if (!migrationExists) {
      return;
    }

    const sql = normalizeSql(readMigration(DRAFT_9709_P1_CLASSIFIER_REGISTRY_MIGRATION));

    [
      '9709.series',
      '9709.functions',
      '9709.coordinate_geometry',
      '9709.circular_measure',
      '9709.differentiation',
      '9709.vectors',
      '9709.quadratics',
      '9709.trigonometry.general',
      '9709.series.sequence_binomial',
      '9709.functions.core',
      '9709.coordinate_geometry.lines_curves',
      '9709.circular_measure.arc_sector',
      '9709.differentiation.application',
      '9709.vectors.geometry',
      '9709.quadratics.equations_inequalities'
    ].forEach((token) => expect(sql).toContain(token));

    expect(sql).toContain("'draft'");
    expect(sql).toContain('on conflict (family_id) do update');
    expect(sql).toContain('on conflict (question_type_id) do update');
  });

  test('9709 p3 classifier registry draft seed covers deterministic classifier outputs', () => {
    const migrationPath = path.join(process.cwd(), DRAFT_9709_P3_CLASSIFIER_REGISTRY_MIGRATION);
    const migrationExists = fs.existsSync(migrationPath);

    expect(migrationExists).toBe(true);
    if (!migrationExists) {
      return;
    }

    const sql = normalizeSql(readMigration(DRAFT_9709_P3_CLASSIFIER_REGISTRY_MIGRATION));

    [
      '9709.algebra',
      '9709.complex_numbers',
      '9709.logarithmic_and_exponential_functions',
      '9709.numerical_solution_of_equations',
      '9709.algebra.polynomial_rational',
      '9709.complex_numbers.argand_mod_arg',
      '9709.log_exp.equations_models',
      '9709.numerical_methods.iteration',
      'paper:p3',
      'source:deterministic_classifier'
    ].forEach((token) => expect(sql).toContain(token));

    expect(sql).toContain("'draft'");
    expect(sql).toContain('on conflict (family_id) do update');
    expect(sql).toContain('on conflict (question_type_id) do update');
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

  test('learning_question_search_projection is migration-owned and freezes descriptor fallback semantics', () => {
    const sql = normalizeSql(readMigration(LEARNING_QUESTION_SEARCH_MIGRATION));

    expect(sql).toContain('create or replace view public.learning_question_search_projection as');

    [
      'qb.question_id',
      'qb.source_kind',
      'qb.subject_code',
      'qb.release_scope_status',
      'qb.primary_topic_id',
      'cn.topic_path::text as primary_topic_path',
      'cn.title as primary_topic_title',
      'qb.family_id',
      'qb.primary_question_type_id',
      'qb.variant_tags',
      'qb.storage_key',
      'qb.q_number',
      'descriptor_rows.summary',
      'descriptor_rows.question_type',
      'descriptor_rows.answer_form',
      'coalesce( descriptor_rows.year, (qb.paper_scope ->> \'year\')::integer ) as year',
      'coalesce( descriptor_rows.session, qb.paper_scope ->> \'session\' ) as session',
      'coalesce( descriptor_rows.paper_number, (qb.paper_scope ->> \'paper\')::integer ) as paper_number',
      'descriptor_rows.variant',
      'as search_text'
    ].forEach((token) => expect(sql).toContain(token));

    expect(sql).toContain("to_regclass('public.question_descriptions_prod_v1') is not null");
    expect(sql).toContain("public.question_descriptions_prod_v1");
    expect(sql).toContain("public.question_descriptions_v0 where status = 'ok'");
    expect(sql).toContain('left join descriptor_rows');
    expect(sql).toContain('descriptor_rows.storage_key = qb.storage_key');
    expect(sql).toContain('descriptor_rows.q_number = qb.q_number');
    expect(sql).toContain("qb.provenance_summary ->> 'summary'");
    expect(sql).toContain("qb.provenance_summary ->> 'search_text'");
    expect(sql).toContain("qb.prompt_representation ->> 'value'");
  });
});
