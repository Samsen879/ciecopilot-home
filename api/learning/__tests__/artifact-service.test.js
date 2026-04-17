import {
  createArtifactService,
  getArtifactLifecycleCapabilities,
  normalizeArtifactLifecycleArtifact,
} from '../lib/artifacts/artifact-service.js';

function createArtifactRepositoryFixture() {
  const artifacts = new Map([
    [
      'art-unverified',
      {
        artifact_id: 'art-unverified',
        artifact_kind: 'misconception_card',
        canonical_home_topic_id: 'topic-trig-equations',
        slot_key: 'common_traps',
        trust_status: 'unverified',
        placement_status: 'inbox',
        lifecycle_status: 'active',
        artifact_state: 'unverified',
        verified_by: null,
        verified_at: null,
        verification_evidence_ref: null,
        released_by: null,
        released_at: null,
        release_evidence_ref: null,
        contested_by: null,
        contested_at: null,
        contested_reason: null,
        superseded_by_artifact_id: null,
        superseded_at: null,
      },
    ],
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
        artifact_state: 'verified',
        verified_by: 'operator-1',
        verified_at: '2026-03-20T08:00:00.000Z',
        verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-1' },
        released_by: null,
        released_at: null,
        release_evidence_ref: null,
        contested_by: null,
        contested_at: null,
        contested_reason: null,
        superseded_by_artifact_id: null,
        superseded_at: null,
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
        artifact_state: 'verified',
        verified_by: 'operator-2',
        verified_at: '2026-03-20T08:05:00.000Z',
        verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-2' },
        released_by: null,
        released_at: null,
        release_evidence_ref: null,
        contested_by: null,
        contested_at: null,
        contested_reason: null,
        superseded_by_artifact_id: null,
        superseded_at: null,
      },
    ],
    [
      'art-successor-non-authoritative',
      {
        artifact_id: 'art-successor-non-authoritative',
        artifact_kind: 'misconception_card',
        canonical_home_topic_id: 'repair-target-topic',
        slot_key: 'common_traps',
        trust_status: 'grounded',
        placement_status: 'inbox',
        lifecycle_status: 'active',
        artifact_state: 'verified',
        verified_by: 'operator-8',
        verified_at: '2026-03-20T08:07:00.000Z',
        verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-8' },
        released_by: null,
        released_at: null,
        release_evidence_ref: null,
        contested_by: null,
        contested_at: null,
        contested_reason: null,
        grounding_refs: [
          {
            kind: 'attempt',
            attempt_id: 'attempt-imported-successor-1',
            runtime_authority_posture: 'non_authoritative',
            runtime_authority_reason_code: 'imported_question_attempt',
          },
        ],
        superseded_by_artifact_id: null,
        superseded_at: null,
      },
    ],
    [
      'art-successor-unverified',
      {
        artifact_id: 'art-successor-unverified',
        artifact_kind: 'misconception_card',
        canonical_home_topic_id: 'repair-target-topic',
        slot_key: 'common_traps',
        trust_status: 'unverified',
        placement_status: 'inbox',
        lifecycle_status: 'active',
        artifact_state: 'unverified',
        verified_by: null,
        verified_at: null,
        verification_evidence_ref: null,
        released_by: null,
        released_at: null,
        release_evidence_ref: null,
        contested_by: null,
        contested_at: null,
        contested_reason: null,
        superseded_by_artifact_id: null,
        superseded_at: null,
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
        artifact_state: 'contested',
        verified_by: 'operator-3',
        verified_at: '2026-03-20T08:10:00.000Z',
        verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-3' },
        released_by: null,
        released_at: null,
        release_evidence_ref: null,
        contested_by: 'operator-4',
        contested_at: '2026-03-20T08:11:00.000Z',
        contested_reason: 'needs human review',
        superseded_by_artifact_id: null,
        superseded_at: null,
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
        artifact_state: 'verified',
        verified_by: 'operator-5',
        verified_at: '2026-03-20T08:15:00.000Z',
        verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-5' },
        released_by: null,
        released_at: null,
        release_evidence_ref: null,
        contested_by: null,
        contested_at: null,
        contested_reason: null,
        superseded_by_artifact_id: null,
        superseded_at: null,
      },
    ],
    [
      'art-released',
      {
        artifact_id: 'art-released',
        artifact_kind: 'misconception_card',
        canonical_home_topic_id: 'topic-trig-equations',
        slot_key: 'common_traps',
        trust_status: 'grounded',
        placement_status: 'inbox',
        lifecycle_status: 'active',
        artifact_state: 'released',
        verified_by: 'operator-6',
        verified_at: '2026-03-20T08:20:00.000Z',
        verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-6' },
        released_by: 'operator-7',
        released_at: '2026-03-20T08:21:00.000Z',
        release_evidence_ref: { kind: 'release_receipt', release_receipt_id: 'release-1' },
        contested_by: null,
        contested_at: null,
        contested_reason: null,
        superseded_by_artifact_id: null,
        superseded_at: null,
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
  test.each([
    [
      'legacy grounded without operator evidence degrades to unverified',
      {
        artifact_id: 'legacy-grounded',
        trust_status: 'grounded',
        lifecycle_status: 'active',
      },
      'unverified',
    ],
    [
      'legacy user_confirmed without operator evidence degrades to unverified',
      {
        artifact_id: 'legacy-user-confirmed',
        trust_status: 'user_confirmed',
        lifecycle_status: 'active',
      },
      'unverified',
    ],
    [
      'legacy revised without explicit audit evidence degrades to unverified',
      {
        artifact_id: 'legacy-revised',
        trust_status: 'unverified',
        lifecycle_status: 'revised',
      },
      'unverified',
    ],
    [
      'explicit operator verification evidence maps to verified',
      {
        artifact_id: 'legacy-verified',
        trust_status: 'grounded',
        lifecycle_status: 'active',
        verified_by: 'operator-1',
        verified_at: '2026-03-20T09:00:00.000Z',
        verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-1' },
      },
      'verified',
    ],
    [
      'explicit release audit evidence maps to released',
      {
        artifact_id: 'legacy-released',
        trust_status: 'grounded',
        lifecycle_status: 'active',
        verified_by: 'operator-1',
        verified_at: '2026-03-20T09:00:00.000Z',
        verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-1' },
        released_by: 'operator-2',
        released_at: '2026-03-20T09:30:00.000Z',
        release_evidence_ref: { kind: 'release_receipt', release_receipt_id: 'release-1' },
      },
      'released',
    ],
    [
      'explicit contested audit evidence maps to contested',
      {
        artifact_id: 'legacy-contested',
        trust_status: 'grounded',
        lifecycle_status: 'active',
        contested_by: 'operator-3',
        contested_at: '2026-03-20T09:45:00.000Z',
        contested_reason: 'incorrect derivation',
      },
      'contested',
    ],
    [
      'explicit superseded markers map to superseded',
      {
        artifact_id: 'legacy-superseded',
        artifact_state: 'unverified',
        trust_status: 'grounded',
        lifecycle_status: 'active',
        superseded_by_artifact_id: 'successor-1',
        superseded_at: '2026-03-20T10:00:00.000Z',
      },
      'superseded',
    ],
    [
      'stale unverified artifact_state does not mask contested markers',
      {
        artifact_id: 'legacy-contested-stale',
        artifact_state: 'unverified',
        trust_status: 'contested',
        lifecycle_status: 'active',
      },
      'contested',
    ],
    [
      'stale unverified artifact_state does not mask superseded lifecycle markers',
      {
        artifact_id: 'legacy-superseded-stale',
        artifact_state: 'unverified',
        trust_status: 'unverified',
        lifecycle_status: 'superseded',
      },
      'superseded',
    ],
  ])('%s', (_label, artifact, expectedState) => {
    const normalized = normalizeArtifactLifecycleArtifact(artifact);

    expect(normalized.artifact_state).toBe(expectedState);
  });

  test.each([
    ['unverified', { shell_visible: true, body_visible: false, resident_eligible: false, authoritative_automation_eligible: false }],
    ['verified', { shell_visible: true, body_visible: true, resident_eligible: true, authoritative_automation_eligible: false }],
    ['released', { shell_visible: true, body_visible: true, resident_eligible: true, authoritative_automation_eligible: true }],
    ['contested', { shell_visible: true, body_visible: false, resident_eligible: false, authoritative_automation_eligible: false }],
    ['superseded', { shell_visible: false, body_visible: false, resident_eligible: false, authoritative_automation_eligible: false }],
  ])('capability gating matches the frozen matrix for %s', (artifactState, expected) => {
    expect(getArtifactLifecycleCapabilities(artifactState)).toEqual(expected);
  });

  test('misconception_card homes to the repair target topic, not the source question topic', async () => {
    const service = createArtifactService({
      artifactRepository: createArtifactRepositoryFixture(),
      lifecycleFlagEnabled: true,
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
      artifact_state: 'unverified',
      slot_key: 'common_traps',
      target_question_type_id: '9709.trigonometry.equations',
    });
  });

  test('mark_verified requires explicit operator evidence and keeps released distinct from verified', async () => {
    const repository = createArtifactRepositoryFixture();
    const service = createArtifactService({
      artifactRepository: repository,
      lifecycleFlagEnabled: true,
      now: () => new Date('2026-03-22T08:30:00.000Z'),
    });

    await expect(
      service.patchArtifact({
        userId: 'operator-9',
        artifactId: 'art-unverified',
        intent: 'mark_released',
        releaseEvidenceRef: { kind: 'release_receipt', release_receipt_id: 'release-without-review' },
      }),
    ).rejects.toMatchObject({
      code: 'artifact_state_conflict',
      status: 409,
    });

    const verified = await service.patchArtifact({
      userId: 'operator-9',
      artifactId: 'art-unverified',
      intent: 'mark_verified',
      verificationEvidenceRef: { kind: 'review_run', review_run_id: 'review-9' },
    });

    expect(verified.artifact).toMatchObject({
      artifact_id: 'art-unverified',
      artifact_state: 'verified',
      verified_by: 'operator-9',
      verification_evidence_ref: { kind: 'review_run', review_run_id: 'review-9' },
      released_by: null,
      released_at: null,
      release_evidence_ref: null,
    });
    expect(verified.artifact.capabilities).toEqual({
      shell_visible: true,
      body_visible: true,
      resident_eligible: true,
      authoritative_automation_eligible: false,
    });
  });

  test('mark_released unlocks authoritative automation only after explicit release evidence', async () => {
    const repository = createArtifactRepositoryFixture();
    const service = createArtifactService({
      artifactRepository: repository,
      lifecycleFlagEnabled: true,
      now: () => new Date('2026-03-22T08:35:00.000Z'),
    });

    const released = await service.patchArtifact({
      userId: 'operator-10',
      artifactId: 'art-pinned',
      intent: 'mark_released',
      releaseEvidenceRef: { kind: 'release_receipt', release_receipt_id: 'release-10' },
    });

    expect(released.artifact).toMatchObject({
      artifact_id: 'art-pinned',
      artifact_state: 'released',
      released_by: 'operator-10',
      release_evidence_ref: { kind: 'release_receipt', release_receipt_id: 'release-10' },
    });
    expect(released.artifact.capabilities.authoritative_automation_eligible).toBe(true);
  });

  test('mark_contested moves a released artifact into hold posture with audit fields', async () => {
    const repository = createArtifactRepositoryFixture();
    const service = createArtifactService({
      artifactRepository: repository,
      lifecycleFlagEnabled: true,
      now: () => new Date('2026-03-22T08:40:00.000Z'),
    });

    const result = await service.patchArtifact({
      userId: 'operator-11',
      artifactId: 'art-released',
      intent: 'mark_contested',
      contestedReason: 'source evidence changed',
    });

    expect(result.artifact).toMatchObject({
      artifact_id: 'art-released',
      artifact_state: 'contested',
      contested_by: 'operator-11',
      contested_at: '2026-03-22T08:40:00.000Z',
      contested_reason: 'source evidence changed',
    });
    expect(result.artifact.capabilities).toEqual({
      shell_visible: true,
      body_visible: false,
      resident_eligible: false,
      authoritative_automation_eligible: false,
    });
  });

  test('superseding a pinned artifact moves the pin to the successor or clears the slot atomically', async () => {
    const repository = createArtifactRepositoryFixture();
    const service = createArtifactService({
      artifactRepository: repository,
      lifecycleFlagEnabled: true,
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
      artifact_state: 'superseded',
      superseded_by_artifact_id: 'art-successor',
      superseded_at: expect.any(String),
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

  test('pinning a new resident-eligible artifact demotes the prior primary so the slot keeps exactly one resident', async () => {
    const repository = createArtifactRepositoryFixture();
    const service = createArtifactService({
      artifactRepository: repository,
      lifecycleFlagEnabled: true,
      now: () => new Date('2026-03-22T08:45:00.000Z'),
    });

    const result = await service.patchArtifact({
      userId: 'student-1',
      artifactId: 'art-successor',
      intent: 'set_placement_status',
      placementStatus: 'pinned',
    });

    expect(result.artifact).toMatchObject({
      artifact_id: 'art-successor',
      placement_status: 'pinned',
      artifact_state: 'verified',
    });
    expect(result.slot_transition).toMatchObject({
      outcome: 'pinned_to_slot',
      slot_key: 'common_traps',
    });

    const snapshot = repository.snapshot();
    expect(snapshot.artifacts.get('art-pinned')).toMatchObject({
      placement_status: 'inbox',
      artifact_state: 'verified',
      lifecycle_status: 'active',
    });
    expect(snapshot.artifacts.get('art-successor')).toMatchObject({
      placement_status: 'pinned',
    });
    expect(
      [...snapshot.artifacts.values()].filter((artifact) =>
        artifact.slot_key === 'common_traps' && artifact.placement_status === 'pinned'
      ),
    ).toHaveLength(1);
    expect(snapshot.workspaceSlots.get('student-1:repair-target-topic:common_traps')).toMatchObject({
      primary_artifact_ref: {
        kind: 'artifact',
        artifact_id: 'art-successor',
      },
    });
  });

  test('superseding a pinned artifact with an unverified successor is rejected and keeps the current resident stable', async () => {
    const repository = createArtifactRepositoryFixture();
    const service = createArtifactService({
      artifactRepository: repository,
      lifecycleFlagEnabled: true,
    });

    await expect(
      service.patchArtifact({
        userId: 'student-1',
        artifactId: 'art-pinned',
        intent: 'attach_superseded_by',
        successorArtifactRef: {
          kind: 'artifact',
          artifact_id: 'art-successor-unverified',
        },
      }),
    ).rejects.toMatchObject({
      code: 'artifact_state_conflict',
      status: 409,
    });

    const snapshot = repository.snapshot();
    expect(snapshot.artifacts.get('art-pinned')).toMatchObject({
      placement_status: 'pinned',
      artifact_state: 'verified',
      lifecycle_status: 'active',
      superseded_by_artifact_id: null,
    });
    expect(snapshot.artifacts.get('art-successor-unverified')).toMatchObject({
      placement_status: 'inbox',
      artifact_state: 'unverified',
    });
    expect(snapshot.workspaceSlots.get('student-1:repair-target-topic:common_traps')).toMatchObject({
      primary_artifact_ref: {
        kind: 'artifact',
        artifact_id: 'art-pinned',
      },
    });
  });

  test('superseding a pinned artifact with a non-authoritative imported successor is rejected and keeps the current resident stable', async () => {
    const repository = createArtifactRepositoryFixture();
    const service = createArtifactService({
      artifactRepository: repository,
      lifecycleFlagEnabled: true,
    });

    await expect(
      service.patchArtifact({
        userId: 'student-1',
        artifactId: 'art-pinned',
        intent: 'attach_superseded_by',
        successorArtifactRef: {
          kind: 'artifact',
          artifact_id: 'art-successor-non-authoritative',
        },
      }),
    ).rejects.toMatchObject({
      code: 'artifact_state_conflict',
      status: 409,
    });

    const snapshot = repository.snapshot();
    expect(snapshot.artifacts.get('art-pinned')).toMatchObject({
      placement_status: 'pinned',
      artifact_state: 'verified',
      lifecycle_status: 'active',
      superseded_by_artifact_id: null,
    });
    expect(snapshot.artifacts.get('art-successor-non-authoritative')).toMatchObject({
      placement_status: 'inbox',
      artifact_state: 'verified',
    });
    expect(snapshot.workspaceSlots.get('student-1:repair-target-topic:common_traps')).toMatchObject({
      primary_artifact_ref: {
        kind: 'artifact',
        artifact_id: 'art-pinned',
      },
    });
  });

  test('set_placement_status rejects pinning a contested artifact', async () => {
    const service = createArtifactService({
      artifactRepository: createArtifactRepositoryFixture(),
      lifecycleFlagEnabled: true,
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

  test('set_placement_status rejects pinning an unverified artifact because it is not resident-eligible', async () => {
    const service = createArtifactService({
      artifactRepository: createArtifactRepositoryFixture(),
      lifecycleFlagEnabled: true,
    });

    await expect(
      service.patchArtifact({
        userId: 'student-1',
        artifactId: 'art-unverified',
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
      lifecycleFlagEnabled: true,
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
