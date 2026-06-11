import fs from 'node:fs';

const fixturesDir = new URL('../__fixtures__/paper-workspace-contract/', import.meta.url);

const STABLE_SLOT_KEYS = [
  'overview_map',
  'core_method_derivation',
  'canonical_worked_example',
  'common_traps',
  'my_notes',
  'review_queue',
];

const COMPLETED_REVIEW_MODES = [
  'quick_recall',
  'reconstruct_derivation',
  'redo_variant',
  'timed_check',
  'trap_fix',
];

function fixtureUrl(name) {
  return new URL(name, fixturesDir);
}

function readFixture(name) {
  return JSON.parse(fs.readFileSync(fixtureUrl(name), 'utf8'));
}

function expectStableSlots(stableSlots) {
  expect(Object.keys(stableSlots)).toEqual(expect.arrayContaining(STABLE_SLOT_KEYS));

  for (const slotKey of STABLE_SLOT_KEYS) {
    expect(stableSlots[slotKey]).toEqual(expect.objectContaining({
      slot_key: slotKey,
    }));
  }
}

describe('paper workspace frontend contract fixtures', () => {
  test('checked-in fixture pack covers every frontend contract surface', () => {
    expect(fs.existsSync(fixturesDir)).toBe(true);

    expect([
      'paper-workspace-envelope.json',
      'paper-topic-section-subview.json',
      'legacy-topic-workspace-fallback.json',
      'review-task-completion-evidence.json',
    ].every((name) => fs.existsSync(fixtureUrl(name)))).toBe(true);
  });

  test('paper workspace envelope preserves backend paper wire keys', () => {
    const payload = readFixture('paper-workspace-envelope.json');

    expect(payload).toEqual(expect.objectContaining({
      paper_scope: '9709:paper:p1',
      workspace_id: 'paper-workspace-1',
      topic_sections: expect.any(Array),
      stable_slots: expect.any(Object),
      paper_workspace: expect.any(Object),
      review_queue: expect.objectContaining({
        scope: 'paper_workspace_review_projection',
        paper_scope: '9709:paper:p1',
      }),
      compatibility: expect.objectContaining({
        surface: 'paper_workspace',
        topic_sections_are_projections: true,
        legacy_topic_fallback: {
          route: '/api/learning/workspaces/:topicId',
          status: 'preserved',
        },
      }),
    }));
    expect(payload.paper_workspace).toEqual(expect.objectContaining({
      paper_scope: payload.paper_scope,
      stable_slots: payload.stable_slots,
    }));
    expect(payload.topic_sections[0]).toEqual(expect.objectContaining({
      paper_workspace_topic_section_id: 'section-topic-1',
      topic_id: 'topic-1',
      topic_workspace_id: 'workspace-1',
      canonical_ownership: expect.objectContaining({
        owner_kind: 'topic',
        topic_id: 'topic-1',
      }),
    }));
    expectStableSlots(payload.stable_slots);
  });

  test('paper topic-section subview stays a projection inside the paper workspace', () => {
    const payload = readFixture('paper-topic-section-subview.json');

    expect(payload).toEqual(expect.objectContaining({
      paper_scope: '9709:paper:p1',
      workspace_id: 'workspace-1',
      paper_workspace: expect.objectContaining({
        paper_scope: '9709:paper:p1',
      }),
      topic_section: expect.objectContaining({
        paper_workspace_topic_section_id: 'section-topic-1',
        topic_id: 'topic-1',
        topic_workspace_id: 'workspace-1',
      }),
      workspace: expect.objectContaining({
        workspace_id: 'workspace-1',
        topic_id: 'topic-1',
      }),
      stable_slots: expect.any(Object),
      review_queue: expect.objectContaining({
        scope: 'paper_topic_section_review_projection',
        topic_id: 'topic-1',
      }),
      compatibility: expect.objectContaining({
        surface: 'paper_topic_section_workspace',
        topic_sections_are_projections: true,
      }),
    }));
    expect(payload.compatibility.legacy_topic_fallback).toEqual({
      route: '/api/learning/workspaces/:topicId',
      status: 'preserved',
    });
  });

  test('legacy topic workspace fallback remains available during migration', () => {
    const payload = readFixture('legacy-topic-workspace-fallback.json');

    expect(payload).toEqual(expect.objectContaining({
      workspace: expect.objectContaining({
        workspace_id: 'workspace-1',
        topic_id: 'topic-1',
      }),
      review_queue: expect.objectContaining({
        scope: 'global_queue_projection',
        topic_id: 'topic-1',
      }),
      compatibility: expect.objectContaining({
        surface: 'legacy_topic_workspace',
        paper_workspace_route: '/api/learning/workspaces/papers/:paperScope',
        legacy_topic_fallback: true,
        paper_scope: null,
        topic_section_focus: expect.objectContaining({
          topic_id: 'topic-1',
          workspace_id: 'workspace-1',
        }),
      }),
    }));
  });

  test('ReviewTask completed-outcome payloads carry mode-specific completion evidence', () => {
    const fixture = readFixture('review-task-completion-evidence.json');
    const byMode = new Map(
      fixture.completed_outcome_payloads.map((payload) => [payload.mode, payload]),
    );

    expect([...byMode.keys()].sort()).toEqual([...COMPLETED_REVIEW_MODES].sort());

    for (const mode of COMPLETED_REVIEW_MODES) {
      const payload = byMode.get(mode);

      expect(payload.request).toEqual(expect.objectContaining({
        intent: 'complete',
        completion_outcome: 'completed',
        completion_evidence: expect.any(Object),
      }));
      expect(payload.request).not.toHaveProperty('state');
      expect(payload.request).not.toHaveProperty('status');
      expect(payload.completed_review_task).toEqual(expect.objectContaining({
        review_task_id: payload.review_task_id,
        mode,
        status: 'completed',
        completion_evidence: expect.objectContaining({
          outcome: 'completed',
          evidence_contract: {
            mode,
            outcome: 'completed',
            validation: 'mode_specific',
          },
        }),
      }));
    }
  });
});
