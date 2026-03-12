/**
 * LaTeX normalization for RAG chunk content.
 * Applied at chunk-generation time to improve embedding consistency
 * and trigram matching for mathematical formulas.
 *
 * Based on Deep Research Report #14 recommendations.
 */

const LATEX_NORM_VERSION = 'v1';

const TRIG_FUNCTIONS = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan'];
const LOG_FUNCTIONS = ['log', 'ln', 'lg'];
const ALL_FUNCTIONS = [...TRIG_FUNCTIONS, ...LOG_FUNCTIONS];

/**
 * Normalize LaTeX content for consistent embedding and retrieval.
 * @param {string} text - Raw text potentially containing LaTeX
 * @returns {{ normalized: string, latex_norm_version: string, replacements_applied: number }}
 */
export function normalizeLatex(text) {
    if (typeof text !== 'string' || text.length === 0) {
        return { normalized: '', latex_norm_version: LATEX_NORM_VERSION, replacements_applied: 0 };
    }

    let result = text;
    let count = 0;

    function applyRule(pattern, replacement) {
        const before = result;
        result = result.replace(pattern, replacement);
        if (result !== before) count++;
    }

    // 1. \dfrac → \frac, \tfrac → \frac
    applyRule(/\\dfrac\b/g, '\\frac');
    applyRule(/\\tfrac\b/g, '\\frac');

    // 2. \displaystyle removal
    applyRule(/\\displaystyle\s*/g, '');

    // 3. Trig/log functions: \sin x → \sin(x), \cos 2x → \cos(2x)
    //    Only when NOT already followed by ( or {
    for (const fn of ALL_FUNCTIONS) {
        const pattern = new RegExp(
            `\\\\${fn}\\s+([a-zA-Z0-9])([a-zA-Z0-9]*)(?![({])`,
            'g',
        );
        applyRule(pattern, `\\${fn}($1$2)`);
    }

    // 4. Normalize \left( ... \right) → ( ... )
    applyRule(/\\left\s*\(/g, '(');
    applyRule(/\\right\s*\)/g, ')');
    applyRule(/\\left\s*\[/g, '[');
    applyRule(/\\right\s*\]/g, ']');
    applyRule(/\\left\s*\{/g, '{');
    applyRule(/\\right\s*\}/g, '}');
    applyRule(/\\left\s*\|/g, '|');
    applyRule(/\\right\s*\|/g, '|');

    // 5. Normalize spacing around operators
    applyRule(/\s*\\cdot\s*/g, ' \\cdot ');
    applyRule(/\s*\\times\s*/g, ' \\times ');

    // 6. Normalize \text{} content (trim internal whitespace)
    applyRule(/\\text\s*\{\s*(.*?)\s*\}/g, '\\text{$1}');

    // 7. Remove redundant braces around single characters: {x} → x (in subscript/superscript context)
    applyRule(/([_^])\{([a-zA-Z0-9])\}/g, '$1$2');

    // 8. Normalize whitespace inside LaTeX delimiters $ ... $ and \( ... \)
    applyRule(/\$\s+/g, '$');
    applyRule(/\s+\$/g, '$');

    return {
        normalized: result,
        latex_norm_version: LATEX_NORM_VERSION,
        replacements_applied: count,
    };
}

/**
 * Estimate formula density: ratio of LaTeX-like patterns to total word count.
 * @param {string} text
 * @returns {number} 0-1 ratio
 */
export function estimateFormulaDensity(text) {
    if (typeof text !== 'string' || text.length === 0) return 0;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 0;

    const latexPatterns = [
        /\\\w+/g,           // \frac, \sin, etc.
        /[_^]/g,            // subscripts, superscripts
        /\$[^$]+\$/g,       // inline math
        /\\[\[\(]/g,        // display math delimiters
        /\{[^}]*\}/g,       // braces
    ];

    let latexTokenCount = 0;
    for (const pattern of latexPatterns) {
        const matches = text.match(pattern);
        if (matches) latexTokenCount += matches.length;
    }

    return Math.min(1, latexTokenCount / words.length);
}
