#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_RETRIEVAL_CONFIG, RETRIEVAL_VERSION } from '../../api/rag/lib/constants.js';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_preflight.json');

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readJson(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function main() {
  const schema = readJson('docs/schemas/askai_response.schema.json');

  const payload = {
    generated_at: new Date().toISOString(),
    rag_s1_contract: {
      ask_endpoint_exists: exists('api/rag/ask.js'),
      route_registry_exists: exists('api/_runtime/route-registry.js'),
      boundary_resolver_exists: exists('api/rag/lib/boundary-resolver.js'),
      schema_exists: exists('docs/schemas/askai_response.schema.json'),
    },
    defaults: {
      retrieval_version: RETRIEVAL_VERSION,
      retrieval: DEFAULT_RETRIEVAL_CONFIG,
    },
    sample_request: {
      query: 'What is the title of this syllabus node?',
      syllabus_node_id: '00000000-0000-0000-0000-000000000000',
      internal_debug: false,
    },
    sample_response_contract: {
      required_top_level: schema?.required || [],
      uncertain_enum: schema?.properties?.uncertain_reason_code?.enum || [],
      leakage_enum: schema?.properties?.topic_leakage_reason?.enum || [],
    },
    artifacts: {
      design: 'codex-spec-mode/rag-strategy-alignment/design.md',
      requirements: 'codex-spec-mode/rag-strategy-alignment/requirements.md',
      tasks: 'codex-spec-mode/rag-strategy-alignment/tasks.md',
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
}

main();

