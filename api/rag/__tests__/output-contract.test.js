import { TOPIC_LEAKAGE_REASON_CODES, UNCERTAIN_REASON_CODES } from '../lib/constants.js';
import { validateAskResponseSchema } from '../lib/response-schema-validator.js';

function buildBasePayload() {
  return {
    answer: 'Grounded answer.',
    uncertain: false,
    uncertain_reason_code: null,
    topic_leakage_flag: false,
    topic_leakage_reason: null,
    evidence: [
      {
        id: 'chunk:1',
        topic_path: '9709.P1',
        snippet: 'snippet',
        score: 0.9,
        source_type: 'chunk',
        source_ref: {
          asset_id: 'chunk:1',
          question_id: '1',
        },
      },
    ],
  };
}

describe('RAG output contract schema', () => {
  it('accepts baseline payload', () => {
    const result = validateAskResponseSchema(buildBasePayload());
    expect(result.valid).toBe(true);
  });

  it('validates each uncertain reason code and rejects invalid value', () => {
    for (const reason of Object.values(UNCERTAIN_REASON_CODES)) {
      const payload = buildBasePayload();
      payload.uncertain = true;
      payload.uncertain_reason_code = reason;
      const valid = validateAskResponseSchema(payload);
      expect(valid.valid).toBe(true);
    }

    const invalid = buildBasePayload();
    invalid.uncertain = true;
    invalid.uncertain_reason_code = 'INVALID_REASON';
    const invalidResult = validateAskResponseSchema(invalid);
    expect(invalidResult.valid).toBe(false);
  });

  it('validates each topic leakage reason code and rejects invalid value', () => {
    for (const reason of Object.values(TOPIC_LEAKAGE_REASON_CODES)) {
      const payload = buildBasePayload();
      payload.topic_leakage_flag = true;
      payload.topic_leakage_reason = reason;
      const valid = validateAskResponseSchema(payload);
      expect(valid.valid).toBe(true);
    }

    const invalid = buildBasePayload();
    invalid.topic_leakage_flag = true;
    invalid.topic_leakage_reason = 'UNKNOWN';
    const invalidResult = validateAskResponseSchema(invalid);
    expect(invalidResult.valid).toBe(false);
  });

  it('enforces source_ref resolvable contract', () => {
    const payload = buildBasePayload();
    payload.evidence[0].source_ref = { asset_id: '' };
    const result = validateAskResponseSchema(payload);
    expect(result.valid).toBe(false);
  });
});

