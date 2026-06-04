import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';

const PROJECT_ROOT = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

describe('AO phase1 entry topology contract', () => {
  it('keeps repo-local workflow scripts exposed from package.json', () => {
    const packageJson = JSON.parse(read('package.json'));

    expect(packageJson.scripts['git:hooks:install']).toBe('bash scripts/git-hooks/install.sh');
    expect(packageJson.scripts['workflow:codex-preflight']).toBe('bash scripts/workflow/codex-preflight.sh');
    expect(packageJson.scripts['workflow:baseline:sync']).toBe('bash scripts/workflow/baseline-sync.sh');
    expect(packageJson.scripts['workflow:task:create']).toBe('bash scripts/workflow/task-create.sh');
    expect(packageJson.scripts['workflow:task:closeout']).toBe('bash scripts/workflow/task-closeout.sh');
  });

  it('points the orchestrator config at the canonical repo root without bridge wording', () => {
    const configText = read('agent-orchestrator.yaml');

    expect(configText).toContain('path: /home/samsen/code/ciecopilot-home');
    expect(configText).not.toContain('Temporary bridge');
    expect(configText).not.toContain('baseline-origin-main-20260402');
    expect(configText).toContain('baseline/origin-main');
  });

  it('keeps agent rules aligned with the stable baseline branch name', () => {
    const agentRulesText = read('.agent-rules.md');

    expect(agentRulesText).toContain('baseline/origin-main');
    expect(agentRulesText).not.toContain('baseline/origin-main-20260402');
    expect(agentRulesText).not.toContain('.worktrees/baseline-origin-main-20260402');
  });

  it('keeps start-clean script discovery repo-local only', () => {
    const startCleanText = read('scripts/ao/start-clean.sh');

    expect(startCleanText).not.toContain('.worktrees/baseline-origin-main-20260402');
    expect(startCleanText).toContain('"$repo_root/scripts/workflow/baseline-sync.sh"');
    expect(startCleanText).toContain('"$repo_root/scripts/git-hooks/install.sh"');
    expect(startCleanText).not.toContain('baseline bridge');
  });
});
