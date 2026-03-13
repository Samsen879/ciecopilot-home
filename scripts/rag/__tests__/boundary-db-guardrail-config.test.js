import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const workflowPath = path.join(ROOT, '.github/workflows/syllabus-boundary-tests.yml');
const preflightPath = path.join(ROOT, 'scripts/compliance/run_syllabus_boundary_preflight.py');
const guardrailSqlPath = path.join(ROOT, 'scripts/db/verify_search_guardrail.sql');
const candidatePoolPriorityMigrationPath = path.join(
  ROOT,
  'supabase/migrations/20260312130000_hybrid_search_v2_candidate_pool_version_priority.sql',
);

describe('boundary db guardrail config', () => {
  test('workflow replays recreated hybrid_search_v2 and latest version-isolation migrations', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('20260118093200_recreate_hybrid_search_v2.sql');
    expect(workflow).toContain('20260302190000_chunks_add_corpus_contract.sql');
    expect(workflow).toContain('20260311173000_hybrid_search_v2_add_corpus_version_filter.sql');
    expect(workflow).toContain('20260312110000_hybrid_search_v2_add_version_priority_dedupe.sql');
    expect(workflow).toContain('20260312123000_hybrid_search_v2_stable_identity_dedupe.sql');
    expect(workflow).toContain('20260312130000_hybrid_search_v2_candidate_pool_version_priority.sql');
    expect(workflow).toContain('20260312131500_hybrid_search_v2_candidate_pool_version_priority_fix.sql');
    expect(workflow).toContain('20260312143000_hybrid_search_v2_asset_family_version_shadow.sql');
  });

  test('preflight validates the recreated and latest hybrid search migrations', () => {
    const preflight = fs.readFileSync(preflightPath, 'utf8');

    expect(preflight).toContain('20260118093200_recreate_hybrid_search_v2.sql');
    expect(preflight).toContain('20260302190000_chunks_add_corpus_contract.sql');
    expect(preflight).toContain('20260311173000_hybrid_search_v2_add_corpus_version_filter.sql');
    expect(preflight).toContain('20260312110000_hybrid_search_v2_add_version_priority_dedupe.sql');
    expect(preflight).toContain('20260312123000_hybrid_search_v2_stable_identity_dedupe.sql');
    expect(preflight).toContain('20260312130000_hybrid_search_v2_candidate_pool_version_priority.sql');
    expect(preflight).toContain('20260312131500_hybrid_search_v2_candidate_pool_version_priority_fix.sql');
    expect(preflight).toContain('20260312143000_hybrid_search_v2_asset_family_version_shadow.sql');
  });

  test('guardrail sql probes multiple syllabus subtrees instead of one arbitrary node', () => {
    const sql = fs.readFileSync(guardrailSqlPath, 'utf8');

    expect(sql).toContain("'9709'");
    expect(sql).toContain("'9702'");
    expect(sql).toContain("'9231'");
  });

  test('candidate-pool version-priority migration stays ASCII-clean for CI replay', () => {
    const migration = fs.readFileSync(candidatePoolPriorityMigrationPath, 'utf8');

    expect([...migration].filter((ch) => ch.charCodeAt(0) > 127)).toEqual([]);
  });
});
