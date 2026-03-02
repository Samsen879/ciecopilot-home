#!/usr/bin/env node
// Execute a real evaluate-v1 request in-process and persist response artifact.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import handler from '../../api/marking/evaluate-v1.js';

const RUN_DIR = path.join(process.cwd(), 'runs', 'phase1');
const OUT_PATH = path.join(RUN_DIR, 'evaluate_v1_smoke_response.json');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

function callEvaluateV1(body) {
  const req = { method: 'POST', headers: {}, body };
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status_code: this.statusCode, body: payload });
        return this;
      },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

function assertOrExit(condition, message, payload = null) {
  if (condition) return;
  if (payload) {
    console.error(message);
    console.error(JSON.stringify(payload, null, 2));
  } else {
    console.error(message);
  }
  process.exit(1);
}

async function main() {
  const payload = {
    user_id: 'bbbbbbbb-2222-4000-8000-000000000001',
    storage_key: '9709/s22/qp11/q01.png',
    q_number: 1,
    subpart: 'a',
    student_steps: [
      { step_id: 's1', text: 'Use correct quadratic method' },
      { step_id: 's2', text: 'Irrelevant sentence that should not match A1 strongly' },
    ],
  };

  const result = await callEvaluateV1(payload);

  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');

  assertOrExit(result.status_code === 200, '[phase1 smoke] evaluate-v1 must return 200', result);
  const body = result.body || {};
  assertOrExit(typeof body.run_id === 'string' && body.run_id.length > 0, '[phase1 smoke] missing run_id', result);
  assertOrExit(
    typeof body.rubric_source_version === 'string' && body.rubric_source_version.length > 0,
    '[phase1 smoke] missing rubric_source_version',
    result,
  );
  assertOrExit(Array.isArray(body.decisions) && body.decisions.length > 0, '[phase1 smoke] decisions[] empty', result);

  console.log(`[phase1 smoke] evaluate-v1 ok, run_id=${body.run_id}`);
  console.log(`[phase1 smoke] output=${OUT_PATH}`);
}

main().catch((err) => {
  console.error('[phase1 smoke] evaluate-v1 check failed');
  console.error(err?.stack || String(err));
  process.exit(1);
});
