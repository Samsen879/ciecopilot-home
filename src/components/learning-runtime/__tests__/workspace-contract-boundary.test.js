import fs from 'node:fs';

const workspaceShellPath = new URL('../WorkspaceShell.js', import.meta.url);
const workspaceViewModelPath = new URL('../view-models/workspace-view-model.js', import.meta.url);

describe('workspace runtime contract boundary', () => {
  test('workspace client modules do not import runtime contracts from api/', () => {
    const workspaceShellSource = fs.readFileSync(workspaceShellPath, 'utf8');
    const workspaceViewModelSource = fs.readFileSync(workspaceViewModelPath, 'utf8');

    expect(workspaceShellSource).not.toMatch(/from\s+['"].*api\/learning\/lib\/contracts\/runtime-contract\.js['"]/);
    expect(workspaceViewModelSource).not.toMatch(/from\s+['"].*api\/learning\/lib\/contracts\/runtime-contract\.js['"]/);
  });

  test('browser-safe runtime contract client mirrors the server subset used by workspace code', async () => {
    const clientContracts = await import('../../../lib/contracts/runtime-contract-client.js');
    const serverContracts = await import('../../../../api/learning/lib/contracts/runtime-contract.js');

    expect(clientContracts.STABLE_SLOT_KEYS).toEqual(serverContracts.STABLE_SLOT_KEYS);
    expect(clientContracts.ARTIFACT_KINDS).toEqual(serverContracts.ARTIFACT_KINDS);
    expect(clientContracts.SLOT_COMPATIBILITY).toEqual(serverContracts.SLOT_COMPATIBILITY);

    for (const slotKey of serverContracts.STABLE_SLOT_KEYS) {
      expect(clientContracts.isStableSlotKey(slotKey)).toBe(serverContracts.isStableSlotKey(slotKey));
    }

    expect(clientContracts.isStableSlotKey('not_a_slot')).toBe(false);

    for (const artifactKind of serverContracts.ARTIFACT_KINDS) {
      expect(clientContracts.isArtifactKind(artifactKind)).toBe(serverContracts.isArtifactKind(artifactKind));
    }

    expect(clientContracts.isArtifactKind('not_an_artifact')).toBe(false);

    for (const slotKey of serverContracts.STABLE_SLOT_KEYS) {
      for (const artifactKind of serverContracts.ARTIFACT_KINDS) {
        expect(clientContracts.isCompatibleArtifactKindForSlot(slotKey, artifactKind)).toBe(
          serverContracts.isCompatibleArtifactKindForSlot(slotKey, artifactKind),
        );
      }
    }

    expect(clientContracts.isCompatibleArtifactKindForSlot('not_a_slot', 'summary_card')).toBe(false);
    expect(clientContracts.isCompatibleArtifactKindForSlot('overview_map', 'not_an_artifact')).toBe(false);
  });
});
