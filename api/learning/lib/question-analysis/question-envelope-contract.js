import {
  validateQuestionEnvelope,
} from './runtime-validator.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (typeof value === 'undefined') {
    return null;
  }

  return JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeQuestionEnvelope(input = {}) {
  const promptRepresentation = isPlainObject(input.prompt_representation)
    ? cloneJson({
      ...input.prompt_representation,
      type: normalizeString(input.prompt_representation.type),
    })
    : null;

  const envelope = {
    source_kind: normalizeString(input.source_kind) || 'imported_question',
    subject_code: normalizeString(input.subject_code),
    prompt_representation: promptRepresentation,
    paper_scope: isPlainObject(input.paper_scope) ? cloneJson(input.paper_scope) : null,
    provenance_summary: isPlainObject(input.provenance_summary)
      ? cloneJson(input.provenance_summary)
      : {},
  };

  return validateQuestionEnvelope(envelope);
}
