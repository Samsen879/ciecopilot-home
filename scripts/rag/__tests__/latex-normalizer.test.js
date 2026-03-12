import { normalizeLatex, estimateFormulaDensity } from '../lib/latex-normalizer.js';

describe('normalizeLatex', () => {
    it('returns empty for null/undefined/empty input', () => {
        expect(normalizeLatex(null).normalized).toBe('');
        expect(normalizeLatex(undefined).normalized).toBe('');
        expect(normalizeLatex('').normalized).toBe('');
        expect(normalizeLatex('').latex_norm_version).toBe('v1');
    });

    it('converts \\dfrac and \\tfrac to \\frac', () => {
        const r = normalizeLatex('\\dfrac{1}{2} + \\tfrac{3}{4}');
        expect(r.normalized).toBe('\\frac{1}{2} + \\frac{3}{4}');
        expect(r.replacements_applied).toBeGreaterThan(0);
    });

    it('removes \\displaystyle', () => {
        expect(normalizeLatex('\\displaystyle \\frac{1}{2}').normalized).toBe('\\frac{1}{2}');
    });

    it('parenthesizes trig functions with bare arguments', () => {
        expect(normalizeLatex('\\sin x').normalized).toBe('\\sin(x)');
        expect(normalizeLatex('\\cos 2x').normalized).toBe('\\cos(2x)');
        expect(normalizeLatex('\\tan theta').normalized).toBe('\\tan(theta)');
    });

    it('does not double-parenthesize already parenthesized trig functions', () => {
        expect(normalizeLatex('\\sin(x)').normalized).toBe('\\sin(x)');
        expect(normalizeLatex('\\cos{2x}').normalized).toBe('\\cos{2x}');
    });

    it('parenthesizes log functions', () => {
        expect(normalizeLatex('\\log x').normalized).toBe('\\log(x)');
        expect(normalizeLatex('\\ln 2x').normalized).toBe('\\ln(2x)');
    });

    it('normalizes \\left/\\right delimiters', () => {
        expect(normalizeLatex('\\left( x \\right)').normalized).toBe('( x )');
        expect(normalizeLatex('\\left[ a \\right]').normalized).toBe('[ a ]');
    });

    it('simplifies single-char subscript/superscript braces', () => {
        expect(normalizeLatex('x_{n} + y^{2}').normalized).toBe('x_n + y^2');
        // Multi-char should be preserved
        expect(normalizeLatex('x_{n+1}').normalized).toBe('x_{n+1}');
    });

    it('is idempotent', () => {
        const input = '\\dfrac{\\sin x}{\\cos 2x}';
        const first = normalizeLatex(input);
        const second = normalizeLatex(first.normalized);
        expect(second.normalized).toBe(first.normalized);
    });

    it('handles plain text without LaTeX gracefully', () => {
        const r = normalizeLatex('Find the value of x where the curve crosses the axis.');
        expect(r.normalized).toBe('Find the value of x where the curve crosses the axis.');
    });
});

describe('estimateFormulaDensity', () => {
    it('returns 0 for empty/plain text', () => {
        expect(estimateFormulaDensity('')).toBe(0);
        expect(estimateFormulaDensity('Hello world')).toBe(0);
    });

    it('returns positive for LaTeX-heavy text', () => {
        const density = estimateFormulaDensity('\\frac{\\sin(x)}{\\cos(x)} = \\tan(x)');
        expect(density).toBeGreaterThan(0);
    });

    it('returns at most 1', () => {
        const density = estimateFormulaDensity('\\a \\b \\c \\d');
        expect(density).toBeLessThanOrEqual(1);
    });
});
