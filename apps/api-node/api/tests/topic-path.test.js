/**
 * Topic Path Codec Tests
 * 
 * Tests for topic path validation, parsing, canonicalization, and comparison.
 * 
 * **Feature: syllabus-boundary-system, Property 6: Topic Path Round-Trip Consistency**
 */

import {
  parse,
  canonicalize,
  serialize,
  isDescendantOf,
  isValidFormat,
  isCanonical,
  isValidTopicPath,
  getParent,
  getDepth,
  getAncestors,
  isUnmapped,
  TopicPathError,
  TopicPathErrorCode,
  UNMAPPED,
} from '#topic-path';

describe('Topic Path Codec', () => {
  // ==========================================================================
  // parse() tests
  // ==========================================================================
  describe('parse()', () => {
    it('should parse valid canonical topic paths', () => {
      expect(parse('9709')).toBe('9709');
      expect(parse('9709.p1')).toBe('9709.p1');
      expect(parse('9709.p1.quadratics')).toBe('9709.p1.quadratics');
      expect(parse('9702.as.mechanics.kinematics')).toBe('9702.as.mechanics.kinematics');
      expect(parse('unmapped')).toBe('unmapped');
    });

    it('should parse paths with underscores', () => {
      expect(parse('9709.p1.completing_square')).toBe('9709.p1.completing_square');
      expect(parse('topic_with_underscores')).toBe('topic_with_underscores');
    });

    it('should parse paths with numbers', () => {
      expect(parse('9709.p1.chapter1')).toBe('9709.p1.chapter1');
      expect(parse('123.456.789')).toBe('123.456.789');
    });

    it('should throw ERR_TOPIC_PATH_EMPTY for empty input', () => {
      expect(() => parse('')).toThrow(TopicPathError);
      expect(() => parse('')).toThrow('cannot be empty');
      
      try {
        parse('');
      } catch (e) {
        expect(e).toBeInstanceOf(TopicPathError);
        expect(e.code).toBe(TopicPathErrorCode.EMPTY);
      }
    });

    it('should throw ERR_TOPIC_PATH_EMPTY for whitespace-only input', () => {
      expect(() => parse('   ')).toThrow(TopicPathError);
      expect(() => parse('\t\n')).toThrow(TopicPathError);
    });

    it('should throw ERR_TOPIC_PATH_NON_CANONICAL for uppercase input', () => {
      expect(() => parse('9709.P1')).toThrow(TopicPathError);
      expect(() => parse('9709.P1.Quadratics')).toThrow('must be lowercase');
      
      try {
        parse('9709.P1');
      } catch (e) {
        expect(e).toBeInstanceOf(TopicPathError);
        expect(e.code).toBe(TopicPathErrorCode.NON_CANONICAL);
      }
    });

    it('should throw ERR_TOPIC_PATH_INVALID_FORMAT for invalid characters', () => {
      expect(() => parse('9709-p1')).toThrow(TopicPathError);
      expect(() => parse('9709/p1')).toThrow(TopicPathError);
      expect(() => parse('9709 p1')).toThrow(TopicPathError);
      expect(() => parse('9709.p1!')).toThrow(TopicPathError);
      expect(() => parse('中文')).toThrow(TopicPathError);
      
      try {
        parse('9709-p1');
      } catch (e) {
        expect(e).toBeInstanceOf(TopicPathError);
        expect(e.code).toBe(TopicPathErrorCode.INVALID_FORMAT);
      }
    });
  });

  // ==========================================================================
  // canonicalize() tests
  // ==========================================================================
  describe('canonicalize()', () => {
    it('should lowercase uppercase paths', () => {
      expect(canonicalize('9709.P1')).toBe('9709.p1');
      expect(canonicalize('9709.P1.Quadratics')).toBe('9709.p1.quadratics');
      expect(canonicalize('UPPERCASE')).toBe('uppercase');
    });

    it('should trim whitespace', () => {
      expect(canonicalize('  9709.p1  ')).toBe('9709.p1');
      expect(canonicalize('\t9709.p1\n')).toBe('9709.p1');
    });

    it('should pass through already canonical paths', () => {
      expect(canonicalize('9709.p1.quadratics')).toBe('9709.p1.quadratics');
    });

    it('should throw ERR_TOPIC_PATH_EMPTY for empty input', () => {
      expect(() => canonicalize('')).toThrow(TopicPathError);
      expect(() => canonicalize('   ')).toThrow(TopicPathError);
    });

    it('should throw ERR_TOPIC_PATH_INVALID_FORMAT for invalid characters', () => {
      // Should NOT silently replace or remove invalid characters
      expect(() => canonicalize('9709-p1')).toThrow(TopicPathError);
      expect(() => canonicalize('9709/p1')).toThrow(TopicPathError);
      expect(() => canonicalize('9709 p1')).toThrow(TopicPathError);
    });

    it('should throw ERR_TOPIC_PATH_INVALID_STRUCTURE for empty labels', () => {
      expect(() => canonicalize('9709..p1')).toThrow(TopicPathError);
      expect(() => canonicalize('.9709.p1')).toThrow(TopicPathError);
      expect(() => canonicalize('9709.p1.')).toThrow(TopicPathError);
      
      try {
        canonicalize('9709..p1');
      } catch (e) {
        expect(e).toBeInstanceOf(TopicPathError);
        expect(e.code).toBe(TopicPathErrorCode.INVALID_STRUCTURE);
      }
    });
  });

  // ==========================================================================
  // serialize() tests
  // ==========================================================================
  describe('serialize()', () => {
    it('should return the topic path string', () => {
      const path = parse('9709.p1.quadratics');
      expect(serialize(path)).toBe('9709.p1.quadratics');
    });
  });

  // ==========================================================================
  // isDescendantOf() tests - CRITICAL for ltree <@ semantics
  // **Feature: syllabus-boundary-system, Property 1: No Topic Leakage**
  // ==========================================================================
  describe('isDescendantOf()', () => {
    it('should return true for equal paths (self is descendant of self)', () => {
      expect(isDescendantOf('9709.p1', '9709.p1')).toBe(true);
      expect(isDescendantOf('9709', '9709')).toBe(true);
      expect(isDescendantOf('9709.p1.quadratics', '9709.p1.quadratics')).toBe(true);
    });

    it('should return true for child in subtree', () => {
      expect(isDescendantOf('9709.p1.quadratics', '9709.p1')).toBe(true);
      expect(isDescendantOf('9709.p1.quadratics', '9709')).toBe(true);
      expect(isDescendantOf('9709.p1.quadratics.completing_square', '9709.p1')).toBe(true);
    });

    it('should return false for different subtrees', () => {
      expect(isDescendantOf('9709.p3', '9709.p1')).toBe(false);
      expect(isDescendantOf('9702.as', '9709.p1')).toBe(false);
    });

    it('should return false for parent (parent is not descendant of child)', () => {
      expect(isDescendantOf('9709.p1', '9709.p1.quadratics')).toBe(false);
      expect(isDescendantOf('9709', '9709.p1')).toBe(false);
    });

    it('should NOT match on string prefix (9709.p10 is NOT descendant of 9709.p1)', () => {
      // This is the critical test - ltree uses dot-separated hierarchy
      expect(isDescendantOf('9709.p10', '9709.p1')).toBe(false);
      expect(isDescendantOf('9709.p1extra', '9709.p1')).toBe(false);
    });

    it('should handle case differences (canonicalize before compare)', () => {
      expect(isDescendantOf('9709.P1.Quadratics', '9709.p1')).toBe(true);
      expect(isDescendantOf('9709.p1.quadratics', '9709.P1')).toBe(true);
    });
  });

  // ==========================================================================
  // Validation helpers tests
  // ==========================================================================
  describe('isValidFormat()', () => {
    it('should return true for valid format (allows uppercase)', () => {
      expect(isValidFormat('9709.P1')).toBe(true);
      expect(isValidFormat('9709.p1.Quadratics')).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(isValidFormat('')).toBe(false);
      expect(isValidFormat('9709-p1')).toBe(false);
      expect(isValidFormat('9709/p1')).toBe(false);
    });
  });

  describe('isCanonical()', () => {
    it('should return true for canonical format', () => {
      expect(isCanonical('9709.p1')).toBe(true);
      expect(isCanonical('9709.p1.quadratics')).toBe(true);
    });

    it('should return false for non-canonical format', () => {
      expect(isCanonical('9709.P1')).toBe(false);
      expect(isCanonical('')).toBe(false);
    });
  });

  describe('isValidTopicPath()', () => {
    it('should be alias for isCanonical', () => {
      expect(isValidTopicPath('9709.p1')).toBe(true);
      expect(isValidTopicPath('9709.P1')).toBe(false);
    });
  });

  // ==========================================================================
  // Utility functions tests
  // ==========================================================================
  describe('getParent()', () => {
    it('should return parent path', () => {
      expect(getParent(parse('9709.p1.quadratics'))).toBe('9709.p1');
      expect(getParent(parse('9709.p1'))).toBe('9709');
    });

    it('should return null for root path', () => {
      expect(getParent(parse('9709'))).toBeNull();
    });
  });

  describe('getDepth()', () => {
    it('should return correct depth', () => {
      expect(getDepth(parse('9709'))).toBe(1);
      expect(getDepth(parse('9709.p1'))).toBe(2);
      expect(getDepth(parse('9709.p1.quadratics'))).toBe(3);
    });
  });

  describe('getAncestors()', () => {
    it('should return all ancestors', () => {
      expect(getAncestors(parse('9709.p1.quadratics'))).toEqual(['9709', '9709.p1']);
      expect(getAncestors(parse('9709.p1'))).toEqual(['9709']);
    });

    it('should return empty array for root', () => {
      expect(getAncestors(parse('9709'))).toEqual([]);
    });
  });

  describe('isUnmapped()', () => {
    it('should return true for unmapped', () => {
      expect(isUnmapped(UNMAPPED)).toBe(true);
      expect(isUnmapped(parse('unmapped'))).toBe(true);
    });

    it('should return false for other paths', () => {
      expect(isUnmapped(parse('9709.p1'))).toBe(false);
    });
  });

  // ==========================================================================
  // Round-trip tests (Property 6)
  // **Feature: syllabus-boundary-system, Property 6: Topic Path Round-Trip Consistency**
  // ==========================================================================
  describe('Round-trip consistency (Property 6)', () => {
    const validPaths = [
      '9709',
      '9709.p1',
      '9709.p1.quadratics',
      '9702.as.mechanics.kinematics',
      'unmapped',
      'a.b.c.d.e.f',
      '123.456.789',
      'topic_with_underscores',
    ];

    it.each(validPaths)('serialize(parse("%s")) should equal original', (path) => {
      const parsed = parse(path);
      const serialized = serialize(parsed);
      expect(serialized).toBe(path);
    });

    it('canonicalize should be idempotent', () => {
      const paths = ['9709.P1', '9709.p1', 'UPPERCASE.PATH'];
      for (const path of paths) {
        const once = canonicalize(path);
        const twice = canonicalize(once);
        expect(twice).toBe(once);
      }
    });
  });
});
