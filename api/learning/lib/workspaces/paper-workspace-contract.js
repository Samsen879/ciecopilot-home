import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { LearningHttpError } from '../http/learning-http.js';

export const PAPER_WORKSPACE_ROUTE = '/api/learning/workspaces/papers/:paperScope';
export const LEGACY_TOPIC_WORKSPACE_ROUTE = '/api/learning/workspaces/:topicId';
export const PAPER_SCOPE_PATTERN = /^[0-9]{4}:paper:p[0-9][a-z0-9_-]*$/;

function normalizeString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function buildInvalidPaperScopeError(details = {}) {
  return new LearningHttpError(
    LEARNING_ERROR_CODES.INVALID_PAYLOAD,
    'paper_scope must be a canonical paper workspace scope such as 9709:paper:p1.',
    {
      status: 400,
      details: {
        field: 'paper_scope',
        expected_format: '9709:paper:p1',
        encoding: 'Encode paper_scope as one URL segment with encodeURIComponent.',
        ...details,
      },
    },
  );
}

export function decodePaperScopeSegment(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw buildInvalidPaperScopeError({ reason: 'missing' });
  }

  try {
    return decodeURIComponent(normalized);
  } catch {
    throw buildInvalidPaperScopeError({ reason: 'invalid_url_encoding' });
  }
}

export function normalizePaperScope(value) {
  const decoded = decodePaperScopeSegment(value);
  if (!PAPER_SCOPE_PATTERN.test(decoded)) {
    throw buildInvalidPaperScopeError({ reason: 'format_mismatch' });
  }

  return decoded;
}

export function getSubjectCodeForPaperScope(paperScope) {
  const normalized = normalizePaperScope(paperScope);
  return normalized.split(':')[0];
}

export function buildPaperWorkspaceCompatibilityEnvelope(payload = {}) {
  const paperWorkspace = payload.paper_workspace ?? {};
  const topicSections = Array.isArray(payload.topic_sections) ? payload.topic_sections : [];

  return {
    paper_scope: paperWorkspace.paper_scope ?? null,
    workspace_id: paperWorkspace.paper_workspace_id ?? null,
    topic_sections: topicSections,
    stable_slots: paperWorkspace.stable_slots ?? {},
    paper_workspace: paperWorkspace,
    review_queue: payload.review_queue ?? null,
    compatibility: {
      surface: 'paper_workspace',
      paper_workspace_route: PAPER_WORKSPACE_ROUTE,
      paper_scope_encoding: 'encodeURIComponent(paper_scope)',
      canonical_owner_kind: 'topic',
      topic_sections_are_projections: true,
      legacy_topic_fallback: {
        route: LEGACY_TOPIC_WORKSPACE_ROUTE,
        status: 'preserved',
      },
    },
  };
}

export function buildPaperTopicSectionCompatibilityEnvelope(payload = {}) {
  const paperWorkspace = payload.paper_workspace ?? {};
  const topicSection = payload.topic_section ?? {};
  const workspace = payload.workspace ?? {};

  return {
    paper_scope: paperWorkspace.paper_scope ?? payload.compatibility?.paper_scope ?? null,
    workspace_id: workspace.workspace_id ?? topicSection.topic_workspace_id ?? null,
    paper_workspace: paperWorkspace,
    topic_section: topicSection,
    workspace,
    stable_slots: workspace.slots ?? {},
    review_queue: payload.review_queue ?? null,
    compatibility: payload.compatibility ?? {
      surface: 'paper_topic_section_workspace',
      paper_workspace_route: PAPER_WORKSPACE_ROUTE,
      canonical_owner_kind: 'topic',
      topic_sections_are_projections: true,
      legacy_topic_fallback: {
        route: LEGACY_TOPIC_WORKSPACE_ROUTE,
        status: 'preserved',
      },
    },
  };
}

export function buildTopicWorkspaceCompatibility(payload = {}) {
  return {
    surface: 'legacy_topic_workspace',
    canonical_owner_kind: 'topic',
    paper_workspace_route: PAPER_WORKSPACE_ROUTE,
    legacy_topic_fallback: true,
    paper_scope: null,
    topic_section_focus: {
      topic_id: payload.workspace?.topic_id ?? null,
      topic_path: payload.workspace?.topic_path ?? null,
      workspace_id: payload.workspace?.workspace_id ?? null,
    },
  };
}
