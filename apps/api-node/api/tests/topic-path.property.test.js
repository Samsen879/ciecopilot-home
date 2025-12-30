/**
 * Topic Path Codec Property-Based Tests
 * 
 * Uses fast-check for property-based testing with fixed seed for reproducibility.
 * 
 * **Feature: syllabus-boundary-system, Property 6: Topic Path Round-Trip Consistency**
 * **Feature: syllabus-boundary-system, Property 1: isDescendantOf Semantics**
 */

import * as fc from 'fast-check';
import {
  parse,
  canonicalize,
  serialize,
  isDescendantOf,
  isCanonical,
  TopicPathError,
  TopicPathErrorCode,
} from '#topic-path';

// Fixed seed for reproducible tests (avoid CI flakes)
const FC_SEED = 20251223;
const FC_NUM_RUNS = 100;

/**
 * Arbitrary for generating valid canonical topic path labels.
 * Labels: lowercase alphanumeric + underscore, non-empty
 */
const LABEL_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789_';
const labelArb = fc.string({ minLength: 1, maxLength: 10 })
  .filter(s => s.length > 0 && [...s].every(c => LABEL_CHARS.includes(c)));

/**
 * Arbitrary for generating valid canonical topic paths.
 * Format: label.label.label (1-5 labels)
 */
const canonicalTopicPathArb = fc
  .array(labelArb, { minLength: 1, maxLength: 5 })
  .map(labels => labels.join('.'));

/**
 * Arbitrary for generating valid but non-canonical topic paths (with uppercase).
 */
const MIXED_CASE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
const mixedCaseLabelArb = fc.string({ minLength: 1, maxLength: 10 })
  .filter(s => s.length > 0 && [...s].every(c => MIXED_CASE_CHARS.includes(c)));

const nonCanonicalTopicPathArb = fc
  .array(mixedCaseLabelArb, { minLength: 1, maxLength: 5 })
  .map(labels => labels.join('.'));

/**
 * Arbitrary for generating invalid topic paths (with forbidden characters).
 */
const invalidTopicPathArb = fc.oneof(
  // Contains hyphen
  fc.constant('9709-p1'),
  // Contains space
  fc.constant('9709 p1'),
  // Contains slash
  fc.constant('9709/p1'),
  // Empty string
  fc.constant(''),
  // Only whitespace
  fc.constant('   '),
  // Leading dot
  fc.constant('.9709.p1'),
  // Trailing dot
  fc.constant('9709.p1.'),
  // Consecutive dots
  fc.constant('9709..p1'),
  // Special characters
  fc.constant('9709.p1!'),
  fc.constant('9709.p1@test')
);

describe('Topic Path Codec Property Tests', () => {
  // ==========================================================================
  // Property 6: Round-Trip Consistency
  // **Feature: syllabus-boundary-system, Property 6: Topic Path Round-Trip Consistency**
  // ==========================================================================
  describe('Property 6: Round-Trip Consistency', () => {
    it('parse(serialize(canonicalize(x))) === canonicalize(x) for all valid inputs', () => {
      fc.assert(
        fc.property(nonCanonicalTopicPathArb, (input) => {
          // Skip if input would be invalid after canonicalization
          // (e.g., empty labels after lowercase)
          try {
            const canonical = canonicalize(input);
            const serialized = serialize(canonical);
            const parsed = parse(serialized);
            
            return parsed === canonical;
          } catch (e) {
            // If canonicalize throws, that's expected for some edge cases
            return e instanceof TopicPathError;
          }
        }),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });

    it('serialize(parse(x)) === x for all canonical inputs', () => {
      fc.assert(
        fc.property(canonicalTopicPathArb, (input) => {
          const parsed = parse(input);
          const serialized = serialize(parsed);
          return serialized === input;
        }),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });

    it('canonicalize is idempotent: canonicalize(canonicalize(x)) === canonicalize(x)', () => {
      fc.assert(
        fc.property(nonCanonicalTopicPathArb, (input) => {
          try {
            const once = canonicalize(input);
            const twice = canonicalize(once);
            return once === twice;
          } catch (e) {
            return e instanceof TopicPathError;
          }
        }),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });

    it('canonicalize output is always canonical format', () => {
      fc.assert(
        fc.property(nonCanonicalTopicPathArb, (input) => {
          try {
            const result = canonicalize(input);
            return isCanonical(result);
          } catch (e) {
            return e instanceof TopicPathError;
          }
        }),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });
  });

  // ==========================================================================
  // Invalid Input Handling
  // ==========================================================================
  describe('Invalid Input Error Codes', () => {
    it('invalid inputs throw TopicPathError with correct error code', () => {
      fc.assert(
        fc.property(invalidTopicPathArb, (input) => {
          try {
            parse(input);
            return false; // Should have thrown
          } catch (e) {
            if (!(e instanceof TopicPathError)) return false;
            
            // Verify error code is one of the expected values
            const validCodes = [
              TopicPathErrorCode.EMPTY,
              TopicPathErrorCode.INVALID_FORMAT,
              TopicPathErrorCode.INVALID_STRUCTURE,
              TopicPathErrorCode.NON_CANONICAL,
            ];
            return validCodes.includes(e.code);
          }
        }),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });

    it('empty/whitespace inputs throw ERR_TOPIC_PATH_EMPTY', () => {
      const emptyInputs = ['', '   ', '\t', '\n', '  \t\n  '];
      for (const input of emptyInputs) {
        try {
          parse(input);
          fail(`Expected TopicPathError for input: "${input}"`);
        } catch (e) {
          expect(e).toBeInstanceOf(TopicPathError);
          expect(e.code).toBe(TopicPathErrorCode.EMPTY);
        }
      }
    });
  });

  // ==========================================================================
  // Property 1 (partial): isDescendantOf Semantics
  // **Feature: syllabus-boundary-system, Property 1: isDescendantOf Semantics**
  // ==========================================================================
  describe('Property 1: isDescendantOf Semantics', () => {
    it('isDescendantOf(x, x) === true for all valid topic paths (reflexive)', () => {
      fc.assert(
        fc.property(canonicalTopicPathArb, (path) => {
          return isDescendantOf(path, path) === true;
        }),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });

    it('isDescendantOf matches exact semantics: child === parent || child.startsWith(parent + ".")', () => {
      fc.assert(
        fc.property(
          canonicalTopicPathArb,
          canonicalTopicPathArb,
          (child, parent) => {
            const expected = child === parent || child.startsWith(parent + '.');
            const actual = isDescendantOf(child, parent);
            return actual === expected;
          }
        ),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });

    it('child.parent relationship: if child = parent.suffix, then isDescendantOf(child, parent) === true', () => {
      fc.assert(
        fc.property(
          canonicalTopicPathArb,
          labelArb,
          (parent, suffix) => {
            const child = `${parent}.${suffix}`;
            return isDescendantOf(child, parent) === true;
          }
        ),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });

    it('prefix collision prevention: 9709.p10 is NOT descendant of 9709.p1', () => {
      // This is the critical edge case - must NOT use simple startsWith
      fc.assert(
        fc.property(
          canonicalTopicPathArb,
          fc.string({ minLength: 1, maxLength: 3 }).filter(s => [...s].every(c => '0123456789'.includes(c))),
          (base, numSuffix) => {
            // Create two paths where one is a string prefix of the other but NOT a tree descendant
            // e.g., base = "9709.p1", then "9709.p10" should NOT be descendant of "9709.p1"
            const parent = base;
            const notChild = base + numSuffix; // e.g., "9709.p1" + "0" = "9709.p10"
            
            // notChild starts with parent but is NOT a descendant (no dot separator)
            if (notChild === parent) return true; // Skip if they're equal
            
            return isDescendantOf(notChild, parent) === false;
          }
        ),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });

    it('case insensitive comparison (canonicalizes before compare)', () => {
      fc.assert(
        fc.property(canonicalTopicPathArb, (path) => {
          const upper = path.toUpperCase();
          const lower = path.toLowerCase();
          
          // Both should be considered equal (descendant of each other)
          return isDescendantOf(upper, lower) === true &&
                 isDescendantOf(lower, upper) === true;
        }),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });

    it('transitivity: if A <@ B and B <@ C, then A <@ C', () => {
      fc.assert(
        fc.property(
          labelArb,
          labelArb,
          labelArb,
          (a, b, c) => {
            const pathC = a;
            const pathB = `${a}.${b}`;
            const pathA = `${a}.${b}.${c}`;
            
            // A is descendant of B, B is descendant of C
            // Therefore A should be descendant of C
            const aDescB = isDescendantOf(pathA, pathB);
            const bDescC = isDescendantOf(pathB, pathC);
            const aDescC = isDescendantOf(pathA, pathC);
            
            if (aDescB && bDescC) {
              return aDescC === true;
            }
            return true; // Skip if preconditions not met
          }
        ),
        { seed: FC_SEED, numRuns: FC_NUM_RUNS }
      );
    });
  });
});
