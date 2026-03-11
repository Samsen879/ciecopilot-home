import {
  evaluateTopicLeakage,
  evaluateTopicLeakageWithAllowlist,
  normalizeTopicLeakageAllowlist,
} from '../lib/topic-leakage-guard.js';

describe('topic leakage guard', () => {
  it('normalizes and deduplicates allowlist topic paths', () => {
    expect(normalizeTopicLeakageAllowlist([' 9709.P1 ', '9709', '9709.P1.', '9709'])).toEqual([
      '9709.P1',
      '9709',
    ]);
  });

  it('allows evidence that stays within any expanded topic path', () => {
    const result = evaluateTopicLeakageWithAllowlist(
      [
        { id: 101, topic_path: '9709.P1' },
        { id: 201, topic_path: '9709.P2.Algebra' },
      ],
      {
        currentTopicPath: '9709.P1',
        allowedTopicPaths: ['9709'],
      },
    );

    expect(result.topic_leakage_flag).toBe(false);
    expect(result.topic_leakage_reason).toBeNull();
    expect(result.leaked_ids).toEqual([]);
    expect(result.allowed_topic_paths).toEqual(['9709.P1', '9709']);
    expect(result.evaluation_mode).toBe('allowlist');
  });

  it('keeps strict current-topic behavior for default evaluation', () => {
    const result = evaluateTopicLeakage(
      [{ id: 201, topic_path: '9709.P2' }],
      '9709.P1',
    );

    expect(result.topic_leakage_flag).toBe(true);
    expect(result.topic_leakage_reason).toBe('APP_LAYER_BUG');
    expect(result.leaked_ids).toEqual([201]);
  });

  it('blocks malformed topic paths even under allowlist mode', () => {
    const result = evaluateTopicLeakageWithAllowlist(
      [{ id: 301, topic_path: ' ' }],
      {
        currentTopicPath: '9709.P1',
        allowedTopicPaths: ['9709'],
      },
    );

    expect(result.topic_leakage_flag).toBe(true);
    expect(result.topic_leakage_reason).toBe('DATA_BAD_TOPIC_PATH');
    expect(result.leaked_ids).toEqual([301]);
  });
});