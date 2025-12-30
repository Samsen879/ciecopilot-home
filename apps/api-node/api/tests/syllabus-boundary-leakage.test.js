/**
 * Syllabus Boundary Leakage Tests (CI Required Gate)
 * 
 * **Feature: syllabus-boundary-system, Property 1: No Topic Leakage (Core Invariant)**
 * **Validates: Requirements 3.2, 7.2, 7.3**
 * 
 * This test suite verifies that hybrid_search_v2 NEVER returns:
 * 1. Chunks outside the current_topic_path subtree
 * 2. Chunks with topic_path = 'unmapped'
 * 
 * ANY FAILURE IN THIS SUITE MUST FAIL THE CI BUILD IMMEDIATELY.
 * 
 * Requires: docker-compose.test.yml running with deterministic seed data
 */

import pg from 'pg';
import { isDescendantOf } from '#topic-path';

const { Pool } = pg;

// Test database connection (matches docker-compose.test.yml)
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '54322'),
  database: process.env.TEST_DB_NAME || 'cie_copilot_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

/**
 * Generate a deterministic test embedding based on direction
 * Matches the seed data embedding strategy
 */
function generateTestEmbedding(a, b) {
  // Format: [a, b, 0, 0, ..., 0] with 1536 dimensions
  const embedding = new Array(1536).fill(0);
  embedding[0] = a;
  embedding[1] = b;
  return `[${embedding.join(',')}]`;
}

/**
 * Check if a topic_path is a valid descendant (matches ltree <@ semantics)
 */
function isValidDescendant(childPath, parentPath) {
  return isDescendantOf(childPath, parentPath);
}

describe('Syllabus Boundary Leakage Tests (CI Required Gate)', () => {
  let pool;

  beforeAll(async () => {
    pool = new Pool(TEST_DB_CONFIG);
    
    // Verify connection
    try {
      const result = await pool.query('SELECT 1 as connected');
      expect(result.rows[0].connected).toBe(1);
    } catch (error) {
      console.error('Failed to connect to test database:', error.message);
      console.error('Ensure docker-compose.test.yml is running');
      throw error;
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  // ==========================================================================
  // Helper function to run hybrid_search_v2 and check for leakage
  // ==========================================================================
  async function runLeakageTest(query, topicPath, embeddingDirection) {
    const embedding = generateTestEmbedding(embeddingDirection[0], embeddingDirection[1]);
    
    const sql = `
      SELECT id, topic_path::text as topic_path, LEFT(snippet, 100) as snippet
      FROM public.hybrid_search_v2(
        $1,
        $2::vector,
        $3::ltree,
        12, 50, 50, 0.3, 0.7, 60
      )
    `;
    
    const result = await pool.query(sql, [query, embedding, topicPath]);
    return result.rows;
  }

  function assertNoLeakage(results, currentTopicPath, testDescription) {
    // Check each result for leakage
    for (const row of results) {
      // Assert 1: topic_path must be descendant of current_topic_path
      const isDescendant = isValidDescendant(row.topic_path, currentTopicPath);
      if (!isDescendant) {
        throw new Error(
          `LEAKAGE DETECTED in "${testDescription}": ` +
          `chunk id=${row.id} has topic_path="${row.topic_path}" ` +
          `which is NOT a descendant of "${currentTopicPath}"`
        );
      }

      // Assert 2: topic_path must NOT be 'unmapped'
      if (row.topic_path === 'unmapped') {
        throw new Error(
          `LEAKAGE DETECTED in "${testDescription}": ` +
          `chunk id=${row.id} has topic_path="unmapped" which should NEVER be returned`
        );
      }
    }

    return true;
  }

  // ==========================================================================
  // 20+ Leakage Test Cases
  // ==========================================================================

  describe('9709 Mathematics Leakage Tests', () => {
    // Direction for 9709.p1.quadratics: [1.0, 0.0]
    it('9709.p1 - quadratic query should only return P1 subtree', async () => {
      const results = await runLeakageTest('quadratic equation formula', '9709.p1', [1.0, 0.0]);
      assertNoLeakage(results, '9709.p1', '9709.p1 quadratic query');
      expect(results.length).toBeGreaterThan(0);
    });

    it('9709.p1 - function query should only return P1 subtree', async () => {
      const results = await runLeakageTest('composite function inverse', '9709.p1', [0.7, 0.7]);
      assertNoLeakage(results, '9709.p1', '9709.p1 function query');
    });

    it('9709.p1.quadratics - specific topic should only return quadratics', async () => {
      const results = await runLeakageTest('completing the square vertex', '9709.p1.quadratics', [1.0, 0.0]);
      assertNoLeakage(results, '9709.p1.quadratics', '9709.p1.quadratics specific');
      expect(results.length).toBeGreaterThan(0);
    });

    it('9709.p1.functions - specific topic should only return functions', async () => {
      const results = await runLeakageTest('domain range mapping', '9709.p1.functions', [0.7, 0.7]);
      assertNoLeakage(results, '9709.p1.functions', '9709.p1.functions specific');
    });

    it('9709.p3 - calculus query should only return P3 subtree', async () => {
      const results = await runLeakageTest('integration differentiation', '9709.p3', [-0.7, 0.7]);
      assertNoLeakage(results, '9709.p3', '9709.p3 calculus query');
    });

    it('9709.p3.trig - trig query should only return trig subtree', async () => {
      const results = await runLeakageTest('sine cosine rule', '9709.p3.trig', [-0.5, 0.866]);
      assertNoLeakage(results, '9709.p3.trig', '9709.p3.trig query');
    });

    it('9709.s1 - probability query should only return S1 subtree', async () => {
      const results = await runLeakageTest('probability conditional', '9709.s1', [-0.866, 0.5]);
      assertNoLeakage(results, '9709.s1', '9709.s1 probability query');
    });

    it('9709 - root level should return all 9709 subtrees', async () => {
      const results = await runLeakageTest('mathematics', '9709', [0.5, 0.5]);
      assertNoLeakage(results, '9709', '9709 root level');
    });
  });

  describe('9702 Physics Leakage Tests', () => {
    it('9702.as - mechanics query should only return AS subtree', async () => {
      const results = await runLeakageTest('Newton force acceleration', '9702.as', [-0.866, -0.5]);
      assertNoLeakage(results, '9702.as', '9702.as mechanics query');
    });

    it('9702.as.mechanics - specific mechanics should only return mechanics', async () => {
      const results = await runLeakageTest('momentum conservation collision', '9702.as.mechanics', [-0.866, -0.5]);
      assertNoLeakage(results, '9702.as.mechanics', '9702.as.mechanics specific');
      expect(results.length).toBeGreaterThan(0);
    });

    it('9702.as.waves - wave query should only return waves subtree', async () => {
      const results = await runLeakageTest('wavelength frequency interference', '9702.as.waves', [-0.7, -0.7]);
      assertNoLeakage(results, '9702.as.waves', '9702.as.waves query');
    });

    it('9702.as.electricity - circuit query should only return electricity', async () => {
      const results = await runLeakageTest('Ohm law resistance current', '9702.as.electricity', [-0.5, -0.866]);
      assertNoLeakage(results, '9702.as.electricity', '9702.as.electricity query');
    });

    it('9702.a2 - fields query should only return A2 subtree', async () => {
      const results = await runLeakageTest('electric field gravitational', '9702.a2', [0.0, -1.0]);
      assertNoLeakage(results, '9702.a2', '9702.a2 fields query');
    });

    it('9702.a2.nuclear - nuclear query should only return nuclear', async () => {
      const results = await runLeakageTest('radioactive decay half-life', '9702.a2.nuclear', [0.5, -0.866]);
      assertNoLeakage(results, '9702.a2.nuclear', '9702.a2.nuclear query');
    });

    it('9702.a2.quantum - quantum query should only return quantum', async () => {
      const results = await runLeakageTest('photoelectric photon energy', '9702.a2.quantum', [0.7, -0.7]);
      assertNoLeakage(results, '9702.a2.quantum', '9702.a2.quantum query');
    });

    it('9702 - root level should return all 9702 subtrees', async () => {
      const results = await runLeakageTest('physics', '9702', [0.0, -0.5]);
      assertNoLeakage(results, '9702', '9702 root level');
    });
  });

  describe('9231 Further Mathematics Leakage Tests', () => {
    it('9231.p1 - complex numbers query should only return P1 subtree', async () => {
      const results = await runLeakageTest('complex number argand', '9231.p1', [0.866, -0.5]);
      assertNoLeakage(results, '9231.p1', '9231.p1 complex query');
    });

    it('9231.p1.complex - specific complex should only return complex', async () => {
      const results = await runLeakageTest('modulus argument De Moivre', '9231.p1.complex', [0.866, -0.5]);
      assertNoLeakage(results, '9231.p1.complex', '9231.p1.complex specific');
      expect(results.length).toBeGreaterThan(0);
    });

    it('9231.p1.matrices - matrix query should only return matrices', async () => {
      const results = await runLeakageTest('eigenvalue eigenvector determinant', '9231.p1.matrices', [0.95, 0.31]);
      assertNoLeakage(results, '9231.p1.matrices', '9231.p1.matrices query');
    });

    it('9231.p2 - hyperbolic query should only return P2 subtree', async () => {
      const results = await runLeakageTest('sinh cosh hyperbolic', '9231.p2', [0.31, 0.95]);
      assertNoLeakage(results, '9231.p2', '9231.p2 hyperbolic query');
    });

    it('9231.m1 - vectors query should only return M1 subtree', async () => {
      const results = await runLeakageTest('dot product cross product', '9231.m1', [-0.31, 0.95]);
      assertNoLeakage(results, '9231.m1', '9231.m1 vectors query');
    });

    it('9231 - root level should return all 9231 subtrees', async () => {
      const results = await runLeakageTest('further mathematics', '9231', [0.5, 0.0]);
      assertNoLeakage(results, '9231', '9231 root level');
    });
  });

  describe('Cross-Syllabus Isolation Tests', () => {
    it('9709.p1 query should NOT return 9702 physics content', async () => {
      // Use physics-like embedding direction but query 9709.p1
      const results = await runLeakageTest('force momentum energy', '9709.p1', [-0.866, -0.5]);
      assertNoLeakage(results, '9709.p1', 'cross-syllabus 9709 vs 9702');
      // Results should be empty or only contain 9709.p1 content
      for (const row of results) {
        expect(row.topic_path.startsWith('9709.p1')).toBe(true);
      }
    });

    it('9702.as query should NOT return 9231 further maths content', async () => {
      // Use further maths-like embedding direction but query 9702.as
      const results = await runLeakageTest('complex matrix eigenvalue', '9702.as', [0.866, -0.5]);
      assertNoLeakage(results, '9702.as', 'cross-syllabus 9702 vs 9231');
      for (const row of results) {
        expect(row.topic_path.startsWith('9702.as')).toBe(true);
      }
    });
  });

  describe('Stability Tests (Deterministic Results)', () => {
    it('same query twice should return identical results', async () => {
      const query = 'quadratic equation';
      const topicPath = '9709.p1';
      const embedding = [1.0, 0.0];

      const results1 = await runLeakageTest(query, topicPath, embedding);
      const results2 = await runLeakageTest(query, topicPath, embedding);

      // Same number of results
      expect(results1.length).toBe(results2.length);

      // Same IDs in same order (stable tie-breaker)
      const ids1 = results1.map(r => r.id);
      const ids2 = results2.map(r => r.id);
      expect(ids1).toEqual(ids2);
    });
  });
});
