import { expandPrerequisiteTopics } from '../lib/s2-prereq-expander.js';

describe('s2 prereq expander', () => {
  it('expands within same subject root and respects max limit', () => {
    const result = expandPrerequisiteTopics({
      currentTopicPath: '9709.P1.3',
      subjectCode: '9709',
      maxExpandedTopics: 2,
      seedRows: [
        { topic_path: '9709.P1.4' },
        { topic_path: '9709.P3.1' },
      ],
    });

    expect(result.expanded_topic_paths.length).toBe(2);
    for (const topicPath of result.expanded_topic_paths) {
      expect(topicPath.startsWith('9709')).toBe(true);
    }
    expect(result.max_expanded_topics).toBe(2);
  });

  it('blocks cross-subject root candidates', () => {
    const result = expandPrerequisiteTopics({
      currentTopicPath: '9709.P1.3',
      subjectCode: '9709',
      seedRows: [
        { topic_path: '9709.P1.4' },
        { topic_path: '9231.P2.1' },
      ],
    });

    expect(result.skipped_topic_paths).toContain('9231.P2.1');
    expect(result.expansion_reason_counts.seed_cross_subject_blocked).toBeGreaterThanOrEqual(1);
    expect(result.expanded_topic_paths.some((item) => item.startsWith('9231'))).toBe(false);
  });

  it('returns empty expansion on invalid current topic path', () => {
    const result = expandPrerequisiteTopics({
      currentTopicPath: '9709/P1/bad',
      seedRows: [{ topic_path: '9709.P1.1' }],
    });

    expect(result.expanded_topic_paths).toHaveLength(0);
    expect(result.expansion_reason_counts.invalid_current_topic_path).toBe(1);
  });

  it('expands subject-root nodes to known paper roots without seed rows', () => {
    const result = expandPrerequisiteTopics({
      currentTopicPath: '9709',
      subjectCode: '9709',
      maxExpandedTopics: 6,
      seedRows: [],
    });

    expect(result.expanded_topic_paths).toContain('9709.P1');
    expect(result.expanded_topic_paths).toContain('9709.P2');
    expect(result.expanded_topic_paths).toContain('9709.S1');
    expect(result.expansion_reason_counts.subject_root_child).toBeGreaterThanOrEqual(1);
  });

  it('expands paper-linked sibling paths for cross-paper retrieval', () => {
    const result = expandPrerequisiteTopics({
      currentTopicPath: '9231.FP2.Matrices',
      subjectCode: '9231',
      seedRows: [],
    });

    expect(result.expanded_topic_paths).toContain('9231.FP1');
    expect(result.expanded_topic_paths).toContain('9231.FP1.Matrices');
    expect(result.expansion_reason_counts.paper_related_root).toBeGreaterThanOrEqual(1);
    expect(result.expansion_reason_counts.paper_related_suffix).toBeGreaterThanOrEqual(1);
  });
});
