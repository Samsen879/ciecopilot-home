import {
  ANCHOR_KINDS,
  SESSION_MODES,
  SESSION_STATES,
  SLOT_COMPATIBILITY,
  STABLE_SLOT_KEYS,
  buildReviewTaskRef,
  isCompatibleArtifactKindForSlot,
} from '../lib/contracts/runtime-contract.js';

test('runtime enums are frozen to the March 20 contract', () => {
  expect(ANCHOR_KINDS).toEqual([
    'concept',
    'question',
    'review_task',
    'artifact',
    'workspace_slot',
  ]);
  expect(SESSION_MODES).toEqual([
    'learn_concept',
    'guided_solve',
    'timed_practice',
    'post_mortem_review',
    'spaced_review',
  ]);
  expect(SESSION_STATES).toEqual([
    'active',
    'handoff_suggested',
    'handed_off',
    'closed',
  ]);
  expect(STABLE_SLOT_KEYS).toEqual([
    'overview_map',
    'core_method_derivation',
    'canonical_worked_example',
    'common_traps',
    'my_notes',
    'review_queue',
  ]);
});

test('slot compatibility freezes artifact residency by stable slot', () => {
  expect(SLOT_COMPATIBILITY).toEqual({
    overview_map: ['summary_card'],
    core_method_derivation: ['derivation_card', 'formula_card'],
    canonical_worked_example: ['worked_example_card'],
    common_traps: ['misconception_card'],
    my_notes: ['free_note'],
    review_queue: [],
  });
  expect(isCompatibleArtifactKindForSlot('overview_map', 'summary_card')).toBe(true);
  expect(isCompatibleArtifactKindForSlot('review_queue', 'summary_card')).toBe(false);
});

test('review task refs are typed objects, not bare ids', () => {
  expect(buildReviewTaskRef('rt-1')).toEqual({
    kind: 'review_task',
    review_task_id: 'rt-1',
  });
});
