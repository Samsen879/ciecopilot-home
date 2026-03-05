import { BOUNDARY_ERROR_CODES } from './constants.js';
import { RagError } from './errors.js';

const BOUNDARY_LOOKUP_MAX_ATTEMPTS = 3;
const BOUNDARY_LOOKUP_RETRY_DELAYS_MS = [50, 150];

function extractAllowedSubjects(authUser) {
  const candidates = [
    authUser?.app_metadata?.allowed_subject_codes,
    authUser?.user_metadata?.allowed_subject_codes,
    authUser?.app_metadata?.allowedSubjects,
    authUser?.user_metadata?.allowedSubjects,
  ];
  for (const item of candidates) {
    if (Array.isArray(item) && item.length > 0) {
      return item.map((v) => String(v).trim()).filter(Boolean);
    }
  }
  return null;
}

function deriveSubjectCode(node) {
  if (node?.syllabus_code) return String(node.syllabus_code);
  if (node?.subject_code) return String(node.subject_code);
  const rawPath = node?.topic_path ? String(node.topic_path) : '';
  return rawPath.split('.')[0] || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableBoundaryLookupError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('timeout') ||
    error?.name === 'AbortError'
  );
}

export async function resolveBoundary(
  {
    syllabus_node_id,
    authUser = null,
    requested_subject_code = null,
  },
  {
    supabase,
    logger = () => {},
  } = {},
) {
  if (!syllabus_node_id) {
    throw new RagError({
      status: 400,
      code: BOUNDARY_ERROR_CODES.TOPIC_PATH_MISSING,
      message: 'syllabus_node_id is required',
    });
  }

  if (!supabase) {
    throw new RagError({
      status: 500,
      code: 'RAG_SUPABASE_MISSING',
      message: 'Supabase client is required',
    });
  }

  const nodeId = String(syllabus_node_id).trim();
  let data = null;
  let error = null;
  let lastThrown = null;

  for (let attempt = 1; attempt <= BOUNDARY_LOOKUP_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await supabase
        .from('curriculum_nodes')
        .select('node_id, topic_path, syllabus_code, subject_code, title, description')
        .eq('node_id', nodeId)
        .maybeSingle();
      data = result?.data ?? null;
      error = result?.error ?? null;
      lastThrown = null;
      break;
    } catch (caught) {
      lastThrown = caught;
      if (!isRetryableBoundaryLookupError(caught) || attempt >= BOUNDARY_LOOKUP_MAX_ATTEMPTS) {
        break;
      }
      logger('warn', 'rag_boundary_lookup_retry', {
        syllabus_node_id: nodeId,
        attempt,
        next_attempt: attempt + 1,
        message: caught?.message || String(caught),
      });
      await sleep(BOUNDARY_LOOKUP_RETRY_DELAYS_MS[attempt - 1] || 0);
    }
  }

  if (lastThrown) {
    logger('error', 'rag_boundary_lookup_failed', {
      syllabus_node_id: nodeId,
      message: lastThrown?.message || String(lastThrown),
      code: lastThrown?.code || null,
      retryable: isRetryableBoundaryLookupError(lastThrown),
    });
    throw new RagError({
      status: 500,
      code: 'RAG_BOUNDARY_LOOKUP_FAILED',
      message: lastThrown?.message || 'Boundary lookup failed',
      details: {
        retryable: isRetryableBoundaryLookupError(lastThrown),
      },
    });
  }

  if (error) {
    logger('error', 'rag_boundary_lookup_failed', {
      syllabus_node_id: nodeId,
      message: error.message,
      code: error.code,
    });
    throw new RagError({
      status: 500,
      code: 'RAG_BOUNDARY_LOOKUP_FAILED',
      message: error.message || 'Boundary lookup failed',
      details: {
        db_code: error.code || null,
      },
    });
  }

  if (!data?.topic_path) {
    throw new RagError({
      status: 404,
      code: BOUNDARY_ERROR_CODES.TOPIC_PATH_NOT_FOUND,
      message: `unknown syllabus_node_id: ${nodeId}`,
    });
  }

  const subjectCode = deriveSubjectCode(data);
  if (requested_subject_code && subjectCode && String(requested_subject_code) !== subjectCode) {
    throw new RagError({
      status: 403,
      code: BOUNDARY_ERROR_CODES.TOPIC_PATH_FORBIDDEN,
      message: 'requested subject_code does not match node scope',
      details: { requested_subject_code, subjectCode },
    });
  }

  const allowedSubjects = extractAllowedSubjects(authUser);
  if (allowedSubjects && subjectCode && !allowedSubjects.includes(subjectCode)) {
    throw new RagError({
      status: 403,
      code: BOUNDARY_ERROR_CODES.TOPIC_PATH_FORBIDDEN,
      message: 'node is outside allowed subject scope',
      details: { subjectCode },
    });
  }

  return {
    syllabus_node_id: data.node_id,
    current_topic_path: String(data.topic_path),
    subject_code: subjectCode,
    title: data.title || '',
    description: data.description || '',
  };
}
