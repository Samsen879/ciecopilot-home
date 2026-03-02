import { normalizeQuery } from '../lib/query-normalizer.js';

describe('query normalizer', () => {
  it('extracts latex-aware tokens and keeps formula sensitivity', () => {
    const result = normalizeQuery('Solve \\sqrt{x^2 + 1} when x_1 = 2 and \\alpha = 3');
    expect(result.is_formula_sensitive).toBe(true);
    expect(result.keyword_tokens).toEqual(expect.arrayContaining(['sqrt', 'x', '2', '1', 'alpha', '3']));
  });
});

