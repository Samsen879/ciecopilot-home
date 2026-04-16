import { createArtifactService } from '../lib/artifacts/artifact-service.js';

function createArtifactRepositoryFixture() {
  const artifacts = new Map([
    [
      'art-pinned',
      {
        artifact_id: 'art-pinned',
        artifact_kind: 'misconception_card',
        canonical_home_topic_id: 'repair-target-topic',
        slot_key: 'common_traps',
        trust_status: 'grounded',
        placement_status: 'pinned',
        lifecycle_status: 'active',
        superseded_by_artifact_id: null,
      },
    ],
    [
      'art-successor',
      {
        artifact_id: 'art-successor',
        artifact_kind: 'misconception_card',
        canonical_home_topic_id: 'repair-target-topic',
        slot_key: 'common_traps',
        trust_status: 'grounded',
        placement_status: 'inbox',
        lifecycle_status: 'active',
        superseded_by_artifact_id: null,
      },
    ],
    [
      'art-contested',
      {
        artifact_id: 'art-contested',
        artifact_kind: 'misconception_card',
        canonical_home_topic_id: 'topic-trig-equations',
        slot_key: 'common_traps',
        trust_status: 'contested',
        placement_status: 'inbox',
        lifecycle_status: 'active',
        superseded_by_artifact_id: null,
      },
    ],
    [
      'art-incompatible',
      {
        artifact_id: 'art-incompatible',
        artifact_kind: 'summary_card',
        canonical_home_topic_id: 'topic-trig-equations',
        slot_key: 'common_traps',
        trust_status: 'grounded',
        placement_status: 'inbox',
        lifecycle_status: 'active',
        superseded_by_artifact_id: null,
      },
    ],
    [
      'art-non-authoritative',
      {
        artifact_id: 'art-non-authoritative',
        artifact_kind: 'misconception_card',
        canonical_home_topic_id: 'topic-trig-identities',
        slot_key: 'common_traps',
        trust_status: 'grounded',
        placement_status: 'inbox',
        lifecycle_status: 'active',
        grounding_refs: [
          {
            kind: 'attempt',
            attempt_id: 'attempt-imported-1',
            runtime_authority_posture: 'non_authoritative',
            runtime_authority_reason_code: 'imported_question_attempt',
          },
        ],
        superseded_by_artifact_id: null,
      },
    ],
  ]);

  const workspaceSlots = new Map([
    [
      'student-1:repair-target-topic:common_traps',
      {
        workspace_slot_id: 'slot-common-traps',
        workspace_id: 'workspace-1',
        workspace_id_owner: 'student-1',
        primary_artifact_ref: {
          kind: 'artifact',
          artifact_id: 'art-pinned',
        },
      },
    ],
  ]);

  return {
    async getArtifactById(artifactId) {
      return artifacts.get(artifactId) || null;
    },

    async updateArtifact(artifactId, patch) {
      const current = artifacts.get(artifactId);
      const next = { ...current, ...patch };
      artifacts.set(artifactId, next);
      return next;
    },

    async getWorkspaceSlotByTopicAndKey({ userId, topicId, slotKey }) {
      return workspaceSlots.get(`${userId}:${topicId}:${slotKey}`) || null;
    },

    async setWorkspaceSlotPrimaryArtifact({ userId, topicId, slotKey, primaryArtifactRef }) {
      const key = `${userId}:${topicId}:${slotKey}`;
      const current = workspaceSlots.get(key) || {
        workspace_slot_id: `slot-${slotKey}`,
        workspace_id: 'workspace-1',
        workspace_id_owner: userId,
      };
      const next = {
        ...current,
        primary_artifact_ref: primaryArtifactRef,
      };
      workspaceSlots.set(key, next);
      return next;
    },

    snapshot() {
      return {
        artifacts: new Map(artifacts),
        workspaceSlots: new Map(workspaceSlots),
      };
    },
  };
}

describe('artifact-service', () => {
  test('misconception_card homes to the repair target topic, not the source question topic', async () => {
    const service = createArtifactService({
      artifactRepository: createArtifactRepositoryFixture(),
    });

    const candidates = await service.buildArtifactCandidates({
      artifact_kind: 'misconception_card',
      canonical_home_topic_id: 'source-question-topic',
      canonical_home_topic_path: '9709/trigonometry/source',
      repair_target_topic_id: 'repair-target-topic',
      repair_target_topic_path: '9709/trigonometry/repair',
      target_family_id: '9709.trigonometry_manipulation_equations',
      target_question_type_id: '9709.trigonometry.equations',
      misconception_tags: ['sign-slip'],
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
      source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-1' },
    });

    expect(candidates[0]).toMatchObject({
      artifact_kind: 'misconception_card',
      canonical_home_topic_id: 'repair-target-topic',
      slot_key: 'common_traps',
      target_question_type_id: '9709.trigonometry.equations',
    });
  });

  test('superseding a pinned artifact moves the pin to the successor or clears the slot atomically', async () => {
    const repository = createArtifactRepositoryFixture();
    const service = createArtifactService({
      artifactRepository: repository,
    });

    const result = await service.patchArtifact({
      userId: 'student-1',
      artifactId: 'art-pinned',
      intent: 'attach_superseded_by',
      successorArtifactRef: {
        kind: 'artifact',
        artifact_id: 'art-successor',
      },
    });

    expect(result.artifact).toMatchObject({
      artifact_id: 'art-pinned',
      lifecycle_status: 'superseded',
      superseded_by_artifact_id: 'art-successor',
    });
    expect(result.slot_transition).toMatchObject({
      outcome: 'moved_to_successor',
      slot_key: 'common_traps',
    });

    const snapshot = repository.snapshot();
    expect(snapshot.artifacts.get('art-successor')).toMatchObject({
      placement_status: 'pinned',
    });
    expect(snapshot.workspaceSlots.get('student-1:repair-target-topic:common_traps')).toMatchObject({
      primary_artifact_ref: {
        kind: 'artifact',
        artifact_id: 'art-successor',
      },
    });
  });

  test('set_placement_status rejects pinning a contested artifact', async () => {
    const service = createArtifactService({
      artifactRepository: createArtifactRepositoryFixture(),
    });

    await expect(
      service.patchArtifact({
        userId: 'student-1',
        artifactId: 'art-contested',
        intent: 'set_placement_status',
        placementStatus: 'pinned',
      }),
    ).rejects.toMatchObject({
      code: 'artifact_state_conflict',
      status: 409,
    });
  });

  test('set_placement_status rejects pinning an artifact into an incompatible slot', async () => {
    const service = createArtifactService({
      artifactRepository: createArtifactRepositoryFixture(),
    });

    await expect(
      service.patchArtifact({
        userId: 'student-1',
        artifactId: 'art-incompatible',
        intent: 'set_placement_status',
        placementStatus: 'pinned',
      }),
    ).rejects.toMatchObject({
      code: 'artifact_state_conflict',
      status: 409,
    });
  });

  test('set_placement_status rejects pinning an artifact grounded only by a non-authoritative imported attempt', async () => {
    const service = createArtifactService({
      artifactRepository: createArtifactRepositoryFixture(),
    });

    await expect(
      service.patchArtifact({
        userId: 'student-1',
        artifactId: 'art-non-authoritative',
        intent: 'set_placement_status',
        placementStatus: 'pinned',
      }),
    ).rejects.toMatchObject({
      code: 'artifact_state_conflict',
      status: 409,
    });
  });
});
