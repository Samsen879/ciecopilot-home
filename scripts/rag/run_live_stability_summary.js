#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROUND1 = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_round1.json');
const ROUND2 = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_round2.json');
const OUT = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_stability.json');

function load(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const r1 = load(ROUND1);
  const r2 = load(ROUND2);
  const pass1 = r1?.status === 'pass' && Number(r1?.total_requests || 0) >= 100;
  const pass2 = r2?.status === 'pass' && Number(r2?.total_requests || 0) >= 100;
  const payload = {
    generated_at: new Date().toISOString(),
    rounds: [
      {
        file: path.relative(ROOT, ROUND1).replace(/\\/g, '/'),
        status: r1?.status || 'missing',
        total_requests: r1?.total_requests || 0,
      },
      {
        file: path.relative(ROOT, ROUND2).replace(/\\/g, '/'),
        status: r2?.status || 'missing',
        total_requests: r2?.total_requests || 0,
      },
    ],
    consecutive_pass_with_sample_ge_100: Boolean(pass1 && pass2),
    required_gate_upgrade_eligible: Boolean(pass1 && pass2),
  };
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT}\n`);
  if (!payload.consecutive_pass_with_sample_ge_100) process.exit(1);
}

main();
