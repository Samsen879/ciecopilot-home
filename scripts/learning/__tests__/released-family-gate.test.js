import fs from 'node:fs';
import path from 'node:path';

describe('released family gate', () => {
  test('current released math families have a passing release-evidence receipt', async () => {
    const { buildReleasedFamilyGateReceipt } = await import('../lib/released-family-gate.js');

    const result = buildReleasedFamilyGateReceipt({
      rootDir: process.cwd(),
    });

    expect(result).toMatchObject({
      status: 'pass',
      release_ready: true,
    });

    expect(result.family_results.map((entry) => entry.family_id).sort()).toEqual([
      '9709.differential_equations',
      '9709.integration_techniques',
      '9709.trigonometry_manipulation_equations',
    ]);

    expect(
      result.family_results.find((entry) => entry.family_id === '9709.trigonometry_manipulation_equations'),
    ).toMatchObject({
      status: 'pass',
      released_question_type_ids: [
        '9709.trigonometry.identities',
        '9709.trigonometry.equations',
      ],
      gates: {
        gold_set: { status: 'pass' },
        rubric_coverage: { status: 'pass' },
        uncertainty_validation: { status: 'pass' },
      },
    });

    expect(
      result.family_results.find((entry) => entry.family_id === '9709.integration_techniques'),
    ).toMatchObject({
      status: 'pass',
      released_question_type_ids: ['9709.integration.application'],
      gates: {
        gold_set: { status: 'pass' },
        rubric_coverage: { status: 'pass' },
        uncertainty_validation: { status: 'pass' },
      },
    });

    expect(
      result.family_results.find((entry) => entry.family_id === '9709.differential_equations'),
    ).toMatchObject({
      status: 'pass',
      released_question_type_ids: ['9709.differential_equations.separable'],
      gates: {
        gold_set: { status: 'pass' },
        rubric_coverage: { status: 'pass' },
        uncertainty_validation: { status: 'pass' },
      },
    });
  });

  test('cli writes auditable json and markdown outputs', async () => {
    const { main } = await import('../run_released_family_gate.js');
    const outJson = 'tmp/released-family-gate-test.json';
    const outMd = 'tmp/released-family-gate-test.md';

    try {
      main([
        '--out-json',
        outJson,
        '--out-md',
        outMd,
      ]);

      expect(fs.existsSync(path.join(process.cwd(), outJson))).toBe(true);
      expect(fs.existsSync(path.join(process.cwd(), outMd))).toBe(true);

      const payload = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), outJson), 'utf8'),
      );
      const markdown = fs.readFileSync(path.join(process.cwd(), outMd), 'utf8');

      expect(payload).toMatchObject({
        status: 'pass',
        release_ready: true,
      });
      expect(markdown).toContain('# Learning Runtime Released Family Gate');
      expect(markdown).toContain('9709.trigonometry_manipulation_equations');
      expect(markdown).toContain('9709.integration_techniques');
      expect(markdown).toContain('9709.differential_equations');
    } finally {
      fs.rmSync(path.join(process.cwd(), outJson), { force: true });
      fs.rmSync(path.join(process.cwd(), outMd), { force: true });
    }
  });
});
