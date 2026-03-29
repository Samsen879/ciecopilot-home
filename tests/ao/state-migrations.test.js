import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from '@jest/globals';

import {
  bootstrapControlPlaneState,
  resolveControlPlanePaths,
} from '../../scripts/ao/lib/state-migrations.js';

const PROJECT_ID = 'ciecopilot-home';
const FIXED_NOW = '2026-03-29T04:45:00.000Z';
const tempDirs = [];

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-control-plane-'));
  tempDirs.push(repoRoot);
  return repoRoot;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readAuditEntries(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split('\n').map((line) => JSON.parse(line));
}

afterEach(() => {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('ao state migrations', () => {
  it('rejects project ids that could escape the repo-local control-plane root', () => {
    const repoRoot = createTempRepo();

    expect(() => resolveControlPlanePaths({
      repoRoot,
      projectId: '../../escape',
    })).toThrow(/projectId/i);
    expect(() => resolveControlPlanePaths({
      repoRoot,
      projectId: 'nested/project',
    })).toThrow(/projectId/i);
  });

  it('bootstraps a fresh repo-local control-plane schema', () => {
    const repoRoot = createTempRepo();

    const result = bootstrapControlPlaneState({
      repoRoot,
      projectId: PROJECT_ID,
      now: FIXED_NOW,
    });
    const paths = resolveControlPlanePaths({
      repoRoot,
      projectId: PROJECT_ID,
    });

    expect(result).toMatchObject({
      bootstrapped: true,
      migrated: true,
      state_root: paths.stateRoot,
    });
    expect(fs.existsSync(paths.schemaPath)).toBe(true);
    expect(fs.existsSync(paths.statePath)).toBe(true);
    expect(fs.existsSync(paths.auditPath)).toBe(true);

    expect(readJson(paths.schemaPath)).toMatchObject({
      project_id: PROJECT_ID,
      current_version: 1,
      latest_version: 1,
      applied_migrations: [
        {
          version: 1,
          key: '0001_bootstrap_control_plane_v1',
          applied_at: FIXED_NOW,
        },
      ],
    });
    expect(readJson(paths.statePath)).toMatchObject({
      project_id: PROJECT_ID,
      controller_modes: [
        {
          controller_id: 'default',
          mode: 'off',
          updated_at: FIXED_NOW,
        },
      ],
    });

    expect(readAuditEntries(paths.auditPath)).toEqual([
      expect.objectContaining({
        entity_kind: 'schema',
        entity_id: 'v1',
        operation: 'bootstrap',
        summary: 'Applied control-plane bootstrap migration.',
      }),
    ]);
  });

  it('is idempotent when the repo-local control-plane schema already exists', () => {
    const repoRoot = createTempRepo();

    bootstrapControlPlaneState({
      repoRoot,
      projectId: PROJECT_ID,
      now: FIXED_NOW,
    });
    const second = bootstrapControlPlaneState({
      repoRoot,
      projectId: PROJECT_ID,
      now: '2026-03-29T05:00:00.000Z',
    });
    const paths = resolveControlPlanePaths({
      repoRoot,
      projectId: PROJECT_ID,
    });

    expect(second).toMatchObject({
      bootstrapped: true,
      migrated: false,
    });
    expect(readJson(paths.schemaPath).updated_at).toBe(FIXED_NOW);
    expect(readAuditEntries(paths.auditPath)).toHaveLength(1);
  });

  it('upgrades a stale schema version to the current bootstrap migration', () => {
    const repoRoot = createTempRepo();
    const paths = resolveControlPlanePaths({
      repoRoot,
      projectId: PROJECT_ID,
    });

    fs.mkdirSync(paths.stateRoot, { recursive: true });
    fs.writeFileSync(paths.schemaPath, `${JSON.stringify({
      schema_version: 'ao.control-plane.schema.v1alpha1',
      format: 'ao_control_plane_schema',
      project_id: PROJECT_ID,
      current_version: 0,
      latest_version: 1,
      created_at: '2026-03-29T03:00:00.000Z',
      updated_at: '2026-03-29T03:00:00.000Z',
      applied_migrations: [],
    }, null, 2)}\n`, 'utf8');

    const result = bootstrapControlPlaneState({
      repoRoot,
      projectId: PROJECT_ID,
      now: FIXED_NOW,
    });

    expect(result).toMatchObject({
      bootstrapped: true,
      migrated: true,
    });
    expect(readJson(paths.schemaPath)).toMatchObject({
      current_version: 1,
      applied_migrations: [
        {
          version: 1,
          key: '0001_bootstrap_control_plane_v1',
        },
      ],
    });
    expect(readJson(paths.statePath).controller_modes).toEqual([
      expect.objectContaining({
        controller_id: 'default',
        mode: 'off',
      }),
    ]);
  });
});
