import fs from 'node:fs';
import path from 'node:path';

describe('p3 rubric validator', () => {
  test('validates the promoted pilot rubric templates against the executable P3 schema', async () => {
    const { validateP3RubricTemplateFile } = await import('../lib/marking/contracts/p3-rubric-validator.js');

    const rubricPaths = [
      'data/learning_runtime/pilot_rubrics/9709.trigonometry.identities.json',
      'data/learning_runtime/pilot_rubrics/9709.trigonometry.equations.json',
      'data/learning_runtime/pilot_rubrics/9709.integration.application.json',
      'data/learning_runtime/pilot_rubrics/9709.differential_equations.separable.json',
    ];

    const results = rubricPaths.map((relPath) => validateP3RubricTemplateFile(
      path.join(process.cwd(), relPath),
    ));

    expect(results.every((result) => result.ok)).toBe(true);
    expect(results.map((result) => result.template.question_type_id)).toEqual([
      '9709.trigonometry.identities',
      '9709.trigonometry.equations',
      '9709.integration.application',
      '9709.differential_equations.separable',
    ]);
  });

  test('rejects templates that omit required P3 structures', async () => {
    const { validateP3RubricTemplate } = await import('../lib/marking/contracts/p3-rubric-validator.js');

    const result = validateP3RubricTemplate({
      schema_version: 'p3.rubric_template.v1',
      rubric_template_id: 'broken-template',
      question_type_id: '9709.integration.application',
      release_state: 'released',
      provenance: {
        source_type: 'official_mark_scheme_excerpt',
        source_refs: ['docs/reports/gpt5.4pro-deep-thinking/P3.md'],
      },
      parts: [],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('VerificationCondition'),
        expect.stringContaining('UncertaintyTrigger'),
      ]),
    );
  });

  test('released-family gate contract points at real pilot rubric template files', () => {
    const contract = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'data/learning_runtime/release_evidence/released-family-gate-contract.v1.json'),
        'utf8',
      ),
    );

    const templatePaths = contract.families.flatMap((family) =>
      (family?.rubric_coverage?.entries ?? []).flatMap((entry) => entry?.rubric_template_paths ?? []));

    expect(templatePaths.sort()).toEqual([
      'data/learning_runtime/pilot_rubrics/9709.differential_equations.separable.json',
      'data/learning_runtime/pilot_rubrics/9709.integration.application.json',
      'data/learning_runtime/pilot_rubrics/9709.trigonometry.equations.json',
      'data/learning_runtime/pilot_rubrics/9709.trigonometry.identities.json',
    ]);
  });
});
