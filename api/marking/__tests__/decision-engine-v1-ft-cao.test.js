import fs from 'node:fs';
import path from 'node:path';
import { runDecisionEngine } from '../lib/decision-engine-v1.js';

const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'marking', 'fixtures', 'ft_cao_fixtures.json');
const FIXTURES = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')).fixtures;

function byId(id) {
  return FIXTURES.find((f) => f.id === id);
}

describe('decision-engine-v1 FT/StrictFT/CAO + accuracy_policy', () => {
  it('propagates dependency_not_met under FT mode', () => {
    const fixture = byId('ft_dependency_propagation');
    const { decisions } = runDecisionEngine({
      student_steps: fixture.student_steps,
      rubric_points: fixture.rubric_points,
    });
    const a1 = decisions.find((d) => d.rubric_id === 'r_a1');
    expect(a1.awarded).toBe(false);
    expect(a1.reason).toBe('dependency_not_met');
    expect(a1).not.toHaveProperty('uncertain_reason');
  });

  it('propagates dependency_not_met under StrictFT mode', () => {
    const fixture = byId('strictft_dependency_propagation');
    const { decisions } = runDecisionEngine({
      student_steps: fixture.student_steps,
      rubric_points: fixture.rubric_points,
    });
    const a1 = decisions.find((d) => d.rubric_id === 'r_a1');
    expect(a1.awarded).toBe(false);
    expect(a1.reason).toBe('dependency_not_met');
  });

  it('exposes uncertain_reason when explicitly enabled', () => {
    const fixture = byId('strictft_dependency_propagation');
    const { decisions } = runDecisionEngine({
      student_steps: fixture.student_steps,
      rubric_points: fixture.rubric_points,
      options: { include_uncertain_reason: true },
    });
    const a1 = decisions.find((d) => d.rubric_id === 'r_a1');
    expect(a1.uncertain_reason.code).toBe('dependency_not_met');
  });

  it('normalizes follow_through alias to FT mode behavior', () => {
    const fixture = byId('follow_through_dependency_propagation');
    const { decisions } = runDecisionEngine({
      student_steps: fixture.student_steps,
      rubric_points: fixture.rubric_points,
    });
    const a1 = decisions.find((d) => d.rubric_id === 'r_a1');
    expect(a1.awarded).toBe(false);
    expect(a1.reason).toBe('dependency_not_met');
  });

  it('normalizes strict_ft alias to StrictFT behavior', () => {
    const fixture = byId('strict_ft_dependency_propagation');
    const { decisions } = runDecisionEngine({
      student_steps: fixture.student_steps,
      rubric_points: fixture.rubric_points,
    });
    const a1 = decisions.find((d) => d.rubric_id === 'r_a1');
    expect(a1.awarded).toBe(false);
    expect(a1.reason).toBe('dependency_not_met');
  });

  it('enforces CAO all-or-nothing within group', () => {
    const fixture = byId('cao_all_or_nothing_group');
    const { decisions } = runDecisionEngine({
      student_steps: fixture.student_steps,
      rubric_points: fixture.rubric_points,
    });
    const cao1 = decisions.find((d) => d.rubric_id === 'r_cao_1');
    const cao2 = decisions.find((d) => d.rubric_id === 'r_cao_2');
    expect(cao1.awarded).toBe(false);
    expect(cao2.awarded).toBe(false);
    expect(cao1.awarded_marks).toBe(0);
    expect(cao2.awarded_marks).toBe(0);
  });

  it('applies point-level accuracy_policy override', () => {
    const fixture = byId('accuracy_policy_override_min_confidence');
    const { decisions } = runDecisionEngine({
      student_steps: fixture.student_steps,
      rubric_points: fixture.rubric_points,
    });
    expect(decisions[0].awarded).toBe(true);
    expect(decisions[0].reason).toBe('best_match');
  });

  it('outputs alignment_confidence and evidence_spans', () => {
    const fixture = byId('accuracy_policy_override_min_confidence');
    const { decisions } = runDecisionEngine({
      student_steps: fixture.student_steps,
      rubric_points: fixture.rubric_points,
    });
    const decision = decisions[0];
    expect(typeof decision.alignment_confidence).toBe('number');
    expect(Array.isArray(decision.evidence_spans)).toBe(true);
    expect(decision.evidence_spans[0]).toHaveProperty('step_id');
    expect(decision.evidence_spans[0]).toHaveProperty('start');
    expect(decision.evidence_spans[0]).toHaveProperty('end');
  });
});
