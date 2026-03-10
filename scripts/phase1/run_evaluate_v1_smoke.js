#!/usr/bin/env node
// Execute a deterministic evaluate-v1 request in-process and persist a rich artifact.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import handler from '../../api/marking/evaluate-v1.js';

const RUN_DIR = path.join(process.cwd(), 'runs', 'phase1');
const FIXTURE_PATH = path.join(RUN_DIR, 'phase1_e2e_fixture_manifest.json');
const OUT_PATH = path.join(RUN_DIR, 'evaluate_v1_smoke_response.json');
const DEFAULT_TIMEOUT_MS = 15000;

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

function readFixtureManifest() {
  try {
    return JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
  } catch (error) {
    console.error('[phase1 smoke] failed to read fixture manifest');
    console.error(error?.stack || String(error));
    process.exit(1);
  }
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

function buildRequest(fixture) {
  const requestBody = fixture?.smoke_request;
  const requestId = fixture?.idempotency?.request_id;
  const runIdempotencyKey = fixture?.idempotency?.run_idempotency_key;

  assertOrExit(requestBody && typeof requestBody === 'object', '[phase1 smoke] missing smoke_request in fixture', fixture);
  assertOrExit(typeof requestId === 'string' && requestId.length > 0, '[phase1 smoke] missing request_id', fixture);
  assertOrExit(
    typeof runIdempotencyKey === 'string' && runIdempotencyKey.length > 0,
    '[phase1 smoke] missing run_idempotency_key',
    fixture,
  );

  return {
    body: requestBody,
    headers: {
      'x-request-id': requestId,
      'x-run-id': runIdempotencyKey,
    },
  };
}

function callEvaluateV1(request) {
  const req = { method: 'POST', headers: request.headers, body: request.body };
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

async function main() {
  const fixture = readFixtureManifest();
  const request = buildRequest(fixture);
  const timeoutMs = Number(process.env.PHASE1_SMOKE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  const result = await Promise.race([
    callEvaluateV1(request),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);

  const artifact = {
    generated_at_utc: new Date().toISOString(),
    fixture_manifest_path: FIXTURE_PATH,
    timeout_ms: timeoutMs,
    request,
    status_code: result.status_code,
    body: result.body,
  };

  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, 'utf-8');

  assertOrExit(result.status_code === 200, '[phase1 smoke] evaluate-v1 must return 200', artifact);
  const body = result.body || {};
  assertOrExit(typeof body.run_id === 'string' && body.run_id.length > 0, '[phase1 smoke] missing run_id', artifact);
  assertOrExit(
    typeof body.rubric_source_version === 'string' && body.rubric_source_version.length > 0,
    '[phase1 smoke] missing rubric_source_version',
    artifact,
  );
  assertOrExit(
    typeof body.scoring_engine_version === 'string' && body.scoring_engine_version.length > 0,
    '[phase1 smoke] missing scoring_engine_version',
    artifact,
  );
  assertOrExit(Array.isArray(body.decisions) && body.decisions.length > 0, '[phase1 smoke] decisions[] empty', artifact);

  console.log(`[phase1 smoke] evaluate-v1 ok, run_id=${body.run_id}`);
  console.log(`[phase1 smoke] request_id=${request.headers['x-request-id']}`);
  console.log(`[phase1 smoke] output=${OUT_PATH}`);
}

main().catch((err) => {
  console.error('[phase1 smoke] evaluate-v1 check failed');
  console.error(err?.stack || String(err));
  process.exit(1);
});
