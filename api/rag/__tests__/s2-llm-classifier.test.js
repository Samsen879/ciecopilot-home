import { classifyS2RouteByLlm } from '../lib/s2-llm-classifier.js';

describe('s2 llm classifier', () => {
  it('returns not enabled status when llm classifier is disabled', async () => {
    const result = await classifyS2RouteByLlm('query', {
      s2Config: {
        llmClassifierEnabled: false,
      },
      fetchImpl: async () => {
        throw new Error('should not call fetch');
      },
    });

    expect(result.available).toBe(false);
    expect(result.route_reason).toBe('llm_classifier_not_enabled_default_s1');
    expect(result.llm_classifier_status).toBe('not_enabled');
  });

  it('returns not configured status when required llm config is missing', async () => {
    const result = await classifyS2RouteByLlm('query', {
      s2Config: {
        llmClassifierEnabled: true,
        llmClassifierBaseUrl: '',
        llmClassifierApiKey: '',
        llmClassifierModel: '',
      },
      fetchImpl: async () => {
        throw new Error('should not call fetch');
      },
    });

    expect(result.available).toBe(false);
    expect(result.route_reason).toBe('llm_classifier_not_configured_default_s1');
    expect(result.llm_classifier_status).toBe('not_configured');
  });

  it('parses upstream json content and returns llm classifier decision', async () => {
    const fetchStub = async () => ({
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  retrieval_route: 's2_augmentation',
                  confidence: 0.82,
                  reason: 'cross-topic query',
                }),
              },
            },
          ],
        };
      },
    });

    const result = await classifyS2RouteByLlm('query', {
      s2Config: {
        llmClassifierEnabled: true,
        llmClassifierBaseUrl: 'https://example.com/v1',
        llmClassifierApiKey: 'k',
        llmClassifierModel: 'm',
        llmClassifierTimeoutMs: 2000,
      },
      fetchImpl: fetchStub,
    });

    expect(result.available).toBe(true);
    expect(result.retrieval_route).toBe('s2_augmentation');
    expect(result.route_reason).toBe('llm_classifier_positive');
    expect(result.route_stage).toBe('llm_classifier');
    expect(result.llm_classifier_used).toBe(true);
    expect(result.llm_classifier_status).toBe('upstream_ok');
    expect(result.route_scores.llm_confidence).toBe(0.82);
  });
});
