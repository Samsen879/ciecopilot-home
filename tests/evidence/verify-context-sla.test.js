import { describe, expect, it, jest } from '@jest/globals';

import {
  buildSummary,
  main,
  parseArgs,
  validateMeasurementPayload,
} from '../../scripts/evidence/verify-context-sla.js';

describe('verify-context-sla contract checks', () => {
  it('parses the contract flag from CLI args', () => {
    const args = parseArgs([
      'node',
      'scripts/evidence/verify-context-sla.js',
      '--url',
      'http://localhost:3000/api/evidence/context',
      '--topic-path',
      '9709.p1.algebra',
      '--token',
      'token-1',
      '--require-contract=false',
    ]);

    expect(args.requireContract).toBe(false);
  });

  it('flags malformed 200 payloads as contract-invalid', () => {
    const result = validateMeasurementPayload({
      mastery: 'bad',
      recent_decisions: [],
      misconception_tags: [],
      recent_errors: [],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('mastery must be an object or null');
  });

  it('includes contract failures in the SLA summary', () => {
    const summary = buildSummary(
      {
        url: 'http://localhost:3000/api/evidence/context',
        topicPath: '9709.p1.algebra',
        limit: 10,
        warmup: 0,
        runs: 2,
        maxP95Ms: 200,
        requireContract: true,
      },
      [
        { ok: true, status: 200, elapsedMs: 25 },
        { ok: false, status: 200, elapsedMs: 40, error: 'response_contract_invalid' },
      ],
    );

    expect(summary.failed_runs).toBe(1);
    expect(summary.sla.pass).toBe(false);
    expect(summary.require_contract).toBe(true);
    expect(summary.failures[0].error).toBe('response_contract_invalid');
  });

  it('returns a failing exit code when the endpoint violates the contract', async () => {
    const logger = { log: jest.fn() };
    const exitCode = await main(
      [
        'node',
        'scripts/evidence/verify-context-sla.js',
        '--url',
        'http://localhost:3000/api/evidence/context',
        '--topic-path',
        '9709.p1.algebra',
        '--token',
        'token-1',
        '--runs',
        '1',
        '--warmup',
        '0',
      ],
      {
        fetchImpl: jest.fn().mockResolvedValue({
          status: 200,
          async text() {
            return JSON.stringify({
              mastery: 'bad',
              recent_decisions: [],
              misconception_tags: [],
              recent_errors: [],
            });
          },
        }),
        logger,
      },
    );

    expect(exitCode).toBe(1);
    expect(logger.log).toHaveBeenCalledTimes(1);
  });
});
