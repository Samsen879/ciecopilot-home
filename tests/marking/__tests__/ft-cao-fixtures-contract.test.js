import fs from 'node:fs';
import path from 'node:path';

describe('ft_cao_fixtures synthetic contract', () => {
  test('fixtures carry explicit synthetic provenance and cover the approved personas', () => {
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'tests/marking/fixtures/ft_cao_fixtures.json'),
        'utf8',
      ),
    );

    const fixtures = Array.isArray(payload?.fixtures) ? payload.fixtures : [];
    const personas = new Set(fixtures.map((fixture) => fixture?.persona));

    expect(personas).toEqual(new Set([
      'secure_correct',
      'developing_partial',
      'method_right_answer_wrong',
      'misconception_specific',
      'low_confidence_sparse',
    ]));

    fixtures.forEach((fixture) => {
      expect(fixture.provenance).toEqual({
        source_kind: 'synthetic',
        usage_scope: 'development_only',
        not_authoritative_learner_evidence: true,
      });
    });
  });
});
