import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(MODULE_DIR, 'p3-rubric-template.schema.json');

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildAjvValidator() {
  const ajv = new Ajv({
    allErrors: true,
    jsonPointers: true,
  });
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return ajv.compile(schema);
}

const validateSchema = buildAjvValidator();

function flattenPoints(parts = []) {
  const collected = [];

  for (const part of Array.isArray(parts) ? parts : []) {
    for (const point of Array.isArray(part?.points) ? part.points : []) {
      collected.push(point);
    }
    if (Array.isArray(part?.subparts)) {
      collected.push(...flattenPoints(part.subparts));
    }
  }

  return collected;
}

function collectUncertaintyTriggers(template = {}) {
  const triggers = [
    ...(Array.isArray(template?.global_uncertainty_rules) ? template.global_uncertainty_rules : []),
  ];

  function visit(parts = []) {
    for (const part of Array.isArray(parts) ? parts : []) {
      if (Array.isArray(part?.uncertainty_triggers)) {
        triggers.push(...part.uncertainty_triggers);
      }
      for (const point of Array.isArray(part?.points) ? part.points : []) {
        if (Array.isArray(point?.uncertainty_triggers)) {
          triggers.push(...point.uncertainty_triggers);
        }
      }
      if (Array.isArray(part?.subparts)) {
        visit(part.subparts);
      }
    }
  }

  visit(template?.parts);
  return triggers;
}

function formatAjvError(error = {}) {
  const dataPath = error.dataPath || error.instancePath || '';
  return `${dataPath || '$'} ${error.message}`.trim();
}

export function validateP3RubricTemplate(template = {}) {
  const schemaOk = validateSchema(template);
  const errors = schemaOk
    ? []
    : (validateSchema.errors || []).map((error) => formatAjvError(error));

  const points = flattenPoints(template?.parts);
  if (points.length === 0 || !points.some((point) => point?.verification_condition)) {
    errors.push('VerificationCondition coverage missing from rubric template.');
  }

  if (collectUncertaintyTriggers(template).length === 0) {
    errors.push('UncertaintyTrigger coverage missing from rubric template.');
  }

  return {
    ok: errors.length === 0,
    errors,
    template: cloneJson(template),
  };
}

export function validateP3RubricTemplateFile(filePath) {
  const template = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return validateP3RubricTemplate(template);
}
