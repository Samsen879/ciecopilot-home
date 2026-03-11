#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { resolveSourcePolicy } from './lib/source-policy.js';

const ROOT = process.cwd();
const COVERAGE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_corpus_source_coverage_summary.json');
const S13_DECISION_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_3_s2_go_no_go_decision.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_s1_3_production_source_posture.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_s1_3_production_source_posture.md');
const TARGET_SUBJECTS = ['9709', '9702', '9231'];

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required artifact missing: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sumValues(values = []) {
  return values.reduce((acc, item) => acc + Number(item || 0), 0);
}

function deriveSubjectCounts(summary, sourceTypes = []) {
  const subjectBySourceType = summary?.subject_by_source_type || {};
  const aggregate = {};
  for (const sourceType of sourceTypes) {
    const counts = subjectBySourceType[sourceType] || {};
    for (const [subject, value] of Object.entries(counts)) {
      aggregate[subject] = (aggregate[subject] || 0) + Number(value || 0);
    }
  }
  return aggregate;
}

function renderReport(payload) {
  const lines = [
    '# RAG S1.3 Production Source Posture',
    '',
    `- Generated at: \`${payload.generated_at}\``,
    `- Status: \`${payload.status}\``,
    `- Historical S1.3 decision preserved: \`${payload.historical_s1_3_decision_preserved}\``,
    `- Historical decision: \`${payload.historical_s1_3_decision}\``,
    '',
    '## Source Policy',
    '',
    `- mode: \`${payload.policy.mode}\``,
    `- description: \`${payload.policy.description}\``,
    `- allowed_source_types: \`${JSON.stringify(payload.policy.allowed_source_types)}\``,
    `- disallowed_source_types: \`${JSON.stringify(payload.policy.disallowed_source_types)}\``,
    '',
    '## Production-Safe Counts (Derived From Existing S1.3 Coverage Artifact)',
    '',
    `- allowed_source_type_counts: \`${JSON.stringify(payload.production_safe.allowed_source_type_counts)}\``,
    `- disallowed_source_type_counts: \`${JSON.stringify(payload.production_safe.disallowed_source_type_counts)}\``,
    `- allowed_subject_counts: \`${JSON.stringify(payload.production_safe.allowed_subject_counts)}\``,
    `- missing_target_subjects: \`${JSON.stringify(payload.production_safe.missing_target_subjects)}\``,
    '',
    '## Assessment',
    '',
    `- note_md_is_production_eligible: \`${payload.assessment.note_md_is_production_eligible}\``,
    `- original_s1_3_required_source_types_are_production_safe: \`${payload.assessment.original_s1_3_required_source_types_are_production_safe}\``,
    `- production_safe_subject_coverage_complete: \`${payload.assessment.production_safe_subject_coverage_complete}\``,
    `- production_safe_coverage_can_replace_historical_s1_3_gate: \`${payload.assessment.production_safe_coverage_can_replace_historical_s1_3_gate}\``,
    '',
    '## Blocking Reasons',
    '',
  ];

  if (!Array.isArray(payload.blocking_reasons) || payload.blocking_reasons.length === 0) {
    lines.push('- none');
  } else {
    for (const reason of payload.blocking_reasons) {
      lines.push(`- ${reason}`);
    }
  }

  lines.push('', '## Next Actions', '');
  for (const action of payload.next_actions || []) {
    lines.push(`- ${action}`);
  }

  lines.push('', '## Inputs', '');
  lines.push(`- coverage_summary: \`${payload.inputs.coverage_summary}\``);
  lines.push(`- s1_3_decision: \`${payload.inputs.s1_3_decision}\``);

  return `${lines.join('\n')}\n`;
}

function main() {
  const coverageSummary = readJson(COVERAGE_FILE);
  const s13Decision = readJson(S13_DECISION_FILE);
  const productionPolicy = resolveSourcePolicy('production');
  const observedSourceTypeCounts = coverageSummary?.source_type_counts || {};
  const allowedSourceTypeCounts = Object.fromEntries(
    productionPolicy.allowed_source_types.map((type) => [type, Number(observedSourceTypeCounts[type] || 0)]),
  );
  const disallowedSourceTypeCounts = Object.fromEntries(
    productionPolicy.disallowed_source_types
      .filter((type) => Number(observedSourceTypeCounts[type] || 0) > 0)
      .map((type) => [type, Number(observedSourceTypeCounts[type] || 0)]),
  );
  const allowedSubjectCounts = deriveSubjectCounts(coverageSummary, productionPolicy.allowed_source_types);
  const missingTargetSubjects = TARGET_SUBJECTS.filter((subject) => Number(allowedSubjectCounts[subject] || 0) === 0);
  const originalRequiredSourceTypes = Array.isArray(coverageSummary?.required_source_types)
    ? coverageSummary.required_source_types
    : [];
  const originalSourceTypesAreProductionSafe = originalRequiredSourceTypes.every(
    (type) => !productionPolicy.disallowed_source_types.includes(type),
  );

  const blockingReasons = [];
  if (!originalSourceTypesAreProductionSafe) {
    blockingReasons.push(
      'historical S1.3 corpus gate required note_md, but note_md now maps to src/data/data-notes and is not production-approved',
    );
  }
  if (Number(disallowedSourceTypeCounts.note_md || 0) > 0) {
    blockingReasons.push(
      `existing S1.3 coverage artifact contains note_md rows (${Number(disallowedSourceTypeCounts.note_md || 0)}) that must be excluded from production-safe coverage claims`,
    );
  }
  if (missingTargetSubjects.length > 0) {
    blockingReasons.push(
      `production-safe source coverage is missing target subjects: ${missingTargetSubjects.join(', ')}`,
    );
  }

  const payload = {
    generated_at: new Date().toISOString(),
    status: blockingReasons.length === 0 ? 'pass' : 'warn',
    historical_s1_3_decision_preserved: true,
    historical_s1_3_decision: s13Decision?.decision || 'unknown',
    policy: productionPolicy,
    production_safe: {
      allowed_source_type_counts: allowedSourceTypeCounts,
      disallowed_source_type_counts: disallowedSourceTypeCounts,
      allowed_subject_counts: allowedSubjectCounts,
      allowed_total_rows: sumValues(Object.values(allowedSourceTypeCounts)),
      missing_target_subjects: missingTargetSubjects,
    },
    assessment: {
      note_md_is_production_eligible: false,
      original_s1_3_required_source_types_are_production_safe: originalSourceTypesAreProductionSafe,
      production_safe_subject_coverage_complete: missingTargetSubjects.length === 0,
      production_safe_coverage_can_replace_historical_s1_3_gate: blockingReasons.length === 0,
    },
    blocking_reasons: blockingReasons,
    next_actions: [
      'do not use src/data/data-notes to satisfy Step 3 production coverage',
      'rerun corpus coverage under production policy after production-approved ingest/backfill is available',
      'treat the 2026-03-05 S1.3 go decision as S2-spec eligibility evidence only, not as production-safe corpus coverage proof',
    ],
    inputs: {
      coverage_summary: path.relative(ROOT, COVERAGE_FILE).replace(/\\/g, '/'),
      s1_3_decision: path.relative(ROOT, S13_DECISION_FILE).replace(/\\/g, '/'),
    },
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderReport(payload), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main();
