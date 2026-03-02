#!/usr/bin/env node
// scripts/marking/run_js_decision_fixture_v1.js
// CLI wrapper: runs decision-engine-v1 on a fixture JSON file.
//
// Usage:
//   node scripts/marking/run_js_decision_fixture_v1.js --input <fixture.json>
//   cat fixture.json | node scripts/marking/run_js_decision_fixture_v1.js
//
// Input format:
//   { "fixtures": [ { "id", "student_steps", "rubric_points", "options?" }, ... ] }
//
// Output (stdout):
//   { "results": [ { "id", "decisions": [...] }, ... ] }

import { readFileSync } from 'node:fs';
import { runDecisionEngine } from '../../api/marking/lib/decision-engine-v1.js';

function parseArgs(argv) {
  const idx = argv.indexOf('--input');
  if (idx !== -1 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return null;
}

function loadFixtures(inputPath) {
  let raw;
  if (inputPath) {
    raw = readFileSync(inputPath, 'utf-8');
  } else {
    // Read from stdin
    raw = readFileSync(0, 'utf-8');
  }
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.fixtures)) {
    throw new Error('Invalid fixture format: expected { "fixtures": [...] }');
  }
  return data.fixtures;
}

function main() {
  const inputPath = parseArgs(process.argv);
  const fixtures = loadFixtures(inputPath);

  const results = fixtures.map((fixture) => {
    const { id, student_steps, rubric_points, options } = fixture;
    const { decisions } = runDecisionEngine({
      student_steps: student_steps || [],
      rubric_points: rubric_points || [],
      options: options || {},
    });
    return { id, decisions };
  });

  const output = JSON.stringify({ results }, null, 2);
  process.stdout.write(output + '\n');
}

main();
