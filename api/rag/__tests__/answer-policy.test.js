import { decideAnswerPolicy } from '../lib/answer-policy.js';

function createBaseArgs(overrides = {}) {
  return {
    query: 'Explain the relationship between the retrieved topics using grounded evidence.',
    evidence: [],
    topicLeakage: { topic_leakage_flag: false, topic_leakage_reason: null },
    llmAnswer: 'Grounded answer.',
    retrievalError: null,
    ...overrides,
  };
}

describe('answer policy conflict detection', () => {
  it('does not treat unrelated mark scheme boilerplate and question text as conflicting evidence', () => {
    const policy = decideAnswerPolicy(
      createBaseArgs({
        evidence: [
          {
            id: '1042',
            snippet:
              'Marks should not be awarded with grade thresholds or grade descriptors in mind. 9709/13 Cambridge International AS & A Level Mathematics mark scheme.',
          },
          {
            id: '733',
            snippet:
              'Find the set of values of x satisfying the inequality and give your answer to 3 significant figures.',
          },
          {
            id: '1503',
            snippet:
              'Marks should not be awarded with grade thresholds or grade descriptors in mind. 9709/23 Cambridge International AS Level Mathematics mark scheme.',
          },
        ],
        llmAnswer: 'Pure Mathematics 2 builds on earlier algebra and inequality manipulation before Pure Mathematics 3.',
      }),
    );

    expect(policy.uncertain).toBe(false);
    expect(policy.uncertain_reason_code).toBeNull();
  });

  it('flags strong accept versus do-not-accept contradictions when snippets overlap on the same claim', () => {
    const policy = decideAnswerPolicy(
      createBaseArgs({
        evidence: [
          {
            id: '201',
            snippet: 'Accept x = 2 as the correct final answer for the quadratic equation.',
            source_ref: {
              asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf',
              question_id: 'Q6a',
            },
          },
          {
            id: '202',
            snippet: 'Do not accept x = 2 as the correct final answer for the quadratic equation.',
            source_ref: {
              asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf',
              question_id: 'Q6a',
            },
          },
        ],
      }),
    );

    expect(policy.uncertain).toBe(true);
    expect(policy.uncertain_reason_code).toBe('CONFLICTING_EVIDENCE');
  });

  it('does not mark opposite-polarity snippets as conflict when they do not overlap on the same claim', () => {
    const policy = decideAnswerPolicy(
      createBaseArgs({
        evidence: [
          {
            id: '301',
            snippet: 'Accept equivalent vector notation for the displacement answer.',
          },
          {
            id: '302',
            snippet: 'Do not accept grade thresholds or grade descriptors in mind when awarding marks.',
          },
        ],
        llmAnswer: 'Use the displacement notation consistently and ignore grade-threshold boilerplate.',
      }),
    );

    expect(policy.uncertain).toBe(false);
    expect(policy.uncertain_reason_code).toBeNull();
  });

  it('does not treat different question anchors as conflicting even when mark-scheme polarity differs', () => {
    const policy = decideAnswerPolicy(
      createBaseArgs({
        evidence: [
          {
            id: '401',
            snippet: 'Accept x = 2 as the correct final answer for the quadratic equation.',
            source_ref: {
              asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf',
              question_id: 'Q6a',
            },
          },
          {
            id: '402',
            snippet: 'Do not accept x = 2 as the correct final answer for the quadratic equation.',
            source_ref: {
              asset_id: 'data/mark-schemes/9709Mathematics/9709_w23_ms_23.pdf',
              question_id: 'Q11',
            },
          },
        ],
        llmAnswer: 'These chunks come from different question anchors and should not be treated as a contradiction.',
      }),
    );

    expect(policy.uncertain).toBe(false);
    expect(policy.uncertain_reason_code).toBeNull();
  });
});
