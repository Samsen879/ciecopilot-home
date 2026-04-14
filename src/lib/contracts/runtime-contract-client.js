// Browser-safe subset copied from api/learning/lib/contracts/runtime-contract.js.
function freezeList(values) {
  return Object.freeze([...values]);
}

function freezeCompatibilityMap(map) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(map).map(([slotKey, artifactKinds]) => [slotKey, freezeList(artifactKinds)]),
    ),
  );
}

export const STABLE_SLOT_KEYS = freezeList([
  'overview_map',
  'core_method_derivation',
  'canonical_worked_example',
  'common_traps',
  'my_notes',
  'review_queue',
]);

export const ARTIFACT_KINDS = freezeList([
  'summary_card',
  'derivation_card',
  'worked_example_card',
  'misconception_card',
  'formula_card',
  'free_note',
]);

export const SLOT_COMPATIBILITY = freezeCompatibilityMap({
  overview_map: ['summary_card'],
  core_method_derivation: ['derivation_card', 'formula_card'],
  canonical_worked_example: ['worked_example_card'],
  common_traps: ['misconception_card'],
  my_notes: ['free_note'],
  review_queue: [],
});

export function isStableSlotKey(value) {
  return STABLE_SLOT_KEYS.includes(value);
}

export function isArtifactKind(value) {
  return ARTIFACT_KINDS.includes(value);
}

export function isCompatibleArtifactKindForSlot(slotKey, artifactKind) {
  return Boolean(SLOT_COMPATIBILITY[slotKey]?.includes(artifactKind));
}
