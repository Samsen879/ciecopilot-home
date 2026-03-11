#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPilotSourceSelection,
  buildProductionSourceInventory,
  renderProductionSourceInventoryReport,
} from './lib/production-source-inventory.js';

const __filename = fileURLToPath(import.meta.url);

function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[i + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function main() {
  const ROOT = process.cwd();
  const argv = parseCliArgs(process.argv.slice(2));
  const subjectCode = String(argv.subject || '9709').trim();
  const restrictedCoverageFile = path.join(ROOT, 'runs', 'backend', 'rag_corpus_source_coverage_restricted_official_summary.json');
  const postureFile = path.join(ROOT, 'runs', 'backend', 'rag_s1_3_production_source_posture.json');
  const coverageFile = path.join(
    ROOT,
    argv['coverage-file']
      || (fs.existsSync(restrictedCoverageFile)
        ? 'runs/backend/rag_corpus_source_coverage_restricted_official_summary.json'
        : 'runs/backend/rag_corpus_source_coverage_production_summary.json'),
  );
  const outJson = path.join(ROOT, argv['out-json'] || 'runs/backend/rag_restricted_official_source_inventory.json');
  const outMd = path.join(ROOT, argv['out-md'] || 'docs/reports/rag_restricted_official_source_inventory.md');
  const pilotOutJson = path.join(
    ROOT,
    argv['pilot-out-json'] || `runs/backend/rag_restricted_official_source_inventory_${subjectCode}_pilot_selection.json`,
  );

  const inventory = buildProductionSourceInventory({
    workspaceRoot: ROOT,
    postureFile,
    coverageFile,
  });
  const pilotSelection = buildPilotSourceSelection(inventory, { subjectCode });

  inventory.pilot_selection = {
    subject_code: subjectCode,
    artifact: path.relative(ROOT, pilotOutJson).replace(/\\/g, '/'),
    selected_count: pilotSelection.selected_count,
    missing_count: pilotSelection.missing.length,
  };

  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.mkdirSync(path.dirname(pilotOutJson), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderProductionSourceInventoryReport(inventory), 'utf8');
  fs.writeFileSync(pilotOutJson, `${JSON.stringify(pilotSelection, null, 2)}\n`, 'utf8');
  process.stdout.write(`${outJson}\n${outMd}\n${pilotOutJson}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
