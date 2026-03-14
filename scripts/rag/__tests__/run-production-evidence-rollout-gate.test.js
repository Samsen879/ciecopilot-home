import path from 'node:path';
import { resolveCliPath } from '../run_production_evidence_rollout_gate.js';

describe('run_production_evidence_rollout_gate cli path handling', () => {
  test('preserves absolute Windows paths instead of joining them onto ROOT', () => {
    const filePath = 'C:\\tmp\\rollout_gate.json';
    expect(resolveCliPath(filePath)).toBe(filePath);
  });

  test('resolves relative paths from the current working directory', () => {
    const filePath = 'data/evidence/production/rollout_gate_v1.json';
    expect(resolveCliPath(filePath)).toBe(path.join(process.cwd(), filePath));
  });
});
