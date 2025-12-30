/**
 * Topic Path Codec
 * 
 * Provides serialization, parsing, validation, and comparison utilities for topic paths.
 * Topic paths follow PostgreSQL ltree format: dot-separated labels where each label
 * contains only lowercase alphanumeric characters and underscores.
 * 
 * @example
 * ```javascript
 * import { parse, canonicalize, isDescendantOf } from './libs/topic-path/index.js';
 * 
 * const path = parse('9709.p1.quadratics');
 * const canonical = canonicalize('9709.P1.Quadratics'); // '9709.p1.quadratics'
 * isDescendantOf('9709.p1.quadratics', '9709.p1'); // true
 * ```
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes for topic path validation failures.
 * @readonly
 * @enum {string}
 */
export const TopicPathErrorCode = Object.freeze({
  /** Input is empty or only whitespace */
  EMPTY: 'ERR_TOPIC_PATH_EMPTY',
  /** Input contains invalid characters (not alphanumeric, underscore, or dot) */
  INVALID_FORMAT: 'ERR_TOPIC_PATH_INVALID_FORMAT',
  /** Input has structural issues (empty labels, leading/trailing dots) */
  INVALID_STRUCTURE: 'ERR_TOPIC_PATH_INVALID_STRUCTURE',
  /** Input is not in canonical lowercase form (only for strict validation) */
  NON_CANONICAL: 'ERR_TOPIC_PATH_NON_CANONICAL',
});

/**
 * Custom error class for topic path validation failures.
 */
export class TopicPathError extends Error {
  /**
   * @param {string} code - Error code from TopicPathErrorCode
   * @param {string} message - Human-readable error message
   * @param {string} input - The invalid input that caused the error
   */
  constructor(code, message, input) {
    super(message);
    this.name = 'TopicPathError';
    /** @type {string} */
    this.code = code;
    /** @type {string} */
    this.input = input;
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Regex for canonical topic path format.
 * - Labels: lowercase alphanumeric + underscore only
 * - Separator: single dot between labels
 * - No leading/trailing dots, no empty labels
 */
const CANONICAL_REGEX = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;

/**
 * Regex for valid (but possibly non-canonical) topic path format.
 * Allows uppercase letters which will be lowercased during canonicalization.
 * Note: This regex allows consecutive dots - structure validation is done separately.
 */
const VALID_CHARS_REGEX = /^[a-zA-Z0-9_.]+$/;

/**
 * Reserved topic path value for unmapped chunks.
 * This is a valid ltree value but has special business meaning.
 * @type {string}
 */
export const UNMAPPED = 'unmapped';

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Validates if a string is a valid topic path format (allows uppercase).
 * Does NOT check if it's canonical (lowercase).
 * 
 * @param {string} str - String to validate
 * @returns {boolean} true if valid format, false otherwise
 */
export function isValidFormat(str) {
  if (!str || str.trim() === '') return false;
  return VALID_CHARS_REGEX.test(str);
}

/**
 * Validates if a string is in canonical topic path format (lowercase only).
 * 
 * @param {string} str - String to validate
 * @returns {boolean} true if canonical format, false otherwise
 */
export function isCanonical(str) {
  if (!str || str.trim() === '') return false;
  return CANONICAL_REGEX.test(str);
}

/**
 * Validates if a string is a valid TopicPath.
 * Alias for isCanonical - only canonical paths are considered valid TopicPaths.
 * 
 * @param {string} str - String to validate
 * @returns {boolean} true if valid TopicPath, false otherwise
 */
export function isValidTopicPath(str) {
  return isCanonical(str);
}

/**
 * Parses a string into a validated TopicPath.
 * Input must already be in canonical format (lowercase).
 * 
 * @param {string} str - String to parse (must be canonical)
 * @returns {string} Validated TopicPath
 * @throws {TopicPathError} if input is invalid
 * 
 * @example
 * ```javascript
 * const path = parse('9709.p1.quadratics'); // OK
 * parse('9709.P1'); // throws ERR_TOPIC_PATH_NON_CANONICAL
 * parse(''); // throws ERR_TOPIC_PATH_EMPTY
 * ```
 */
export function parse(str) {
  // Check for empty input
  if (!str || str.trim() === '') {
    throw new TopicPathError(
      TopicPathErrorCode.EMPTY,
      'Topic path cannot be empty',
      str ?? ''
    );
  }

  const trimmed = str.trim();

  // Check for valid characters (allows uppercase for better error message)
  if (!VALID_CHARS_REGEX.test(trimmed)) {
    throw new TopicPathError(
      TopicPathErrorCode.INVALID_FORMAT,
      `Topic path contains invalid characters. Only alphanumeric and underscore allowed, dot-separated. Got: "${trimmed}"`,
      str
    );
  }

  // Check for canonical format (lowercase)
  if (!CANONICAL_REGEX.test(trimmed)) {
    throw new TopicPathError(
      TopicPathErrorCode.NON_CANONICAL,
      `Topic path must be lowercase. Got: "${trimmed}". Use canonicalize() to convert.`,
      str
    );
  }

  return trimmed;
}

/**
 * Canonicalizes a topic path string: trim + lowercase.
 * Does NOT replace or remove invalid characters - throws if invalid.
 * 
 * @param {string} str - String to canonicalize
 * @returns {string} Canonical TopicPath
 * @throws {TopicPathError} if input contains invalid characters
 * 
 * @example
 * ```javascript
 * canonicalize('9709.P1.Quadratics'); // '9709.p1.quadratics'
 * canonicalize('  9709.p1  '); // '9709.p1'
 * canonicalize('9709-p1'); // throws ERR_TOPIC_PATH_INVALID_FORMAT
 * ```
 */
export function canonicalize(str) {
  // Check for empty input
  if (!str || str.trim() === '') {
    throw new TopicPathError(
      TopicPathErrorCode.EMPTY,
      'Topic path cannot be empty',
      str ?? ''
    );
  }

  const trimmed = str.trim();

  // Check for valid characters BEFORE lowercasing
  // This ensures we don't silently accept invalid input
  if (!VALID_CHARS_REGEX.test(trimmed)) {
    throw new TopicPathError(
      TopicPathErrorCode.INVALID_FORMAT,
      `Topic path contains invalid characters. Only alphanumeric and underscore allowed, dot-separated. Got: "${trimmed}"`,
      str
    );
  }

  // Check for structural issues (empty labels, leading/trailing dots)
  if (trimmed.startsWith('.') || trimmed.endsWith('.') || trimmed.includes('..')) {
    throw new TopicPathError(
      TopicPathErrorCode.INVALID_STRUCTURE,
      `Topic path has empty label (consecutive dots or leading/trailing dot). Got: "${trimmed}"`,
      str
    );
  }

  return trimmed.toLowerCase();
}

/**
 * Serializes a TopicPath to a string for JSON/storage.
 * Since TopicPath is already a string, this is essentially identity.
 * 
 * @param {string} topicPath - TopicPath to serialize
 * @returns {string} String representation
 */
export function serialize(topicPath) {
  return topicPath;
}

/**
 * Checks if a child topic path is a descendant of (or equal to) a parent path.
 * 
 * **CRITICAL**: This MUST match PostgreSQL ltree `<@` semantics exactly:
 * - `child <@ parent` is true if child equals parent OR child is in parent's subtree
 * - Subtree membership is determined by dot-separated hierarchy, NOT string prefix
 * 
 * @param {string} child - The potential descendant path
 * @param {string} parent - The potential ancestor path
 * @returns {boolean} true if child is descendant of (or equal to) parent
 * 
 * @example
 * ```javascript
 * isDescendantOf('9709.p1', '9709.p1');           // true (equal)
 * isDescendantOf('9709.p1.quadratics', '9709.p1'); // true (child in subtree)
 * isDescendantOf('9709.p3', '9709.p1');           // false (different subtree)
 * isDescendantOf('9709.p10', '9709.p1');          // false (NOT a prefix match!)
 * isDescendantOf('9709.p1', '9709.p1.quadratics'); // false (parent not descendant of child)
 * ```
 */
export function isDescendantOf(child, parent) {
  // Canonicalize both for comparison (handles case differences)
  const childCanon = child.toLowerCase();
  const parentCanon = parent.toLowerCase();
  
  // Equal paths: child is descendant of itself
  if (childCanon === parentCanon) {
    return true;
  }
  
  // Child must start with parent followed by a dot
  // This ensures '9709.p10' is NOT considered descendant of '9709.p1'
  return childCanon.startsWith(parentCanon + '.');
}

/**
 * Gets the parent path of a topic path.
 * Returns null if the path has no parent (single label).
 * 
 * @param {string} topicPath - Topic path to get parent of
 * @returns {string|null} Parent TopicPath or null
 * 
 * @example
 * ```javascript
 * getParent('9709.p1.quadratics'); // '9709.p1'
 * getParent('9709.p1'); // '9709'
 * getParent('9709'); // null
 * ```
 */
export function getParent(topicPath) {
  const lastDot = topicPath.lastIndexOf('.');
  if (lastDot === -1) {
    return null;
  }
  return topicPath.substring(0, lastDot);
}

/**
 * Gets the depth (number of labels) of a topic path.
 * 
 * @param {string} topicPath - Topic path to measure
 * @returns {number} Number of labels (depth)
 * 
 * @example
 * ```javascript
 * getDepth('9709'); // 1
 * getDepth('9709.p1'); // 2
 * getDepth('9709.p1.quadratics'); // 3
 * ```
 */
export function getDepth(topicPath) {
  return topicPath.split('.').length;
}

/**
 * Gets all ancestor paths of a topic path (excluding itself).
 * 
 * @param {string} topicPath - Topic path to get ancestors of
 * @returns {string[]} Array of ancestor TopicPaths, from root to immediate parent
 * 
 * @example
 * ```javascript
 * getAncestors('9709.p1.quadratics'); // ['9709', '9709.p1']
 * getAncestors('9709'); // []
 * ```
 */
export function getAncestors(topicPath) {
  const labels = topicPath.split('.');
  const ancestors = [];
  
  for (let i = 1; i < labels.length; i++) {
    ancestors.push(labels.slice(0, i).join('.'));
  }
  
  return ancestors;
}

/**
 * Checks if a topic path is the reserved 'unmapped' value.
 * 
 * @param {string} topicPath - Topic path to check
 * @returns {boolean} true if unmapped
 */
export function isUnmapped(topicPath) {
  return topicPath === UNMAPPED;
}
