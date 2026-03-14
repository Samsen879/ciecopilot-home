import { filterRowsBySourcePolicy, resolveSourcePolicy } from '../lib/source-policy.js';

describe('source policy', () => {
  test('resolves production_evidence as a distinct policy with enabled and reserved types', () => {
    const policy = resolveSourcePolicy('production_evidence');

    expect(policy.mode).toBe('production_evidence');
    expect(policy.allowed_source_types).toEqual(['evidence_authored', 'evidence_transformed']);
    expect(policy.enabled_source_types).toEqual(['evidence_authored', 'evidence_transformed']);
    expect(policy.reserved_source_types).toEqual(['evidence_reserved']);
    expect(policy.disallowed_source_types).toEqual(
      expect.arrayContaining(['note_md', 'past_paper_pdf', 'mark_scheme_pdf']),
    );
  });

  test('filters production evidence rows without admitting note_md or official pdf types', () => {
    const result = filterRowsBySourcePolicy(
      [
        { id: 1, source_type: 'evidence_authored' },
        { id: 2, source_type: 'evidence_transformed' },
        { id: 3, source_type: 'evidence_reserved' },
        { id: 4, source_type: 'note_md' },
        { id: 5, source_type: 'past_paper_pdf' },
      ],
      'production_evidence',
    );

    expect(result.included_rows.map((row) => row.id)).toEqual([1, 2]);
    expect(result.excluded_rows.map((row) => row.id)).toEqual([3, 4, 5]);
    expect(result.unknown_rows).toEqual([]);
  });
});
