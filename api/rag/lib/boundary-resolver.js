import { BOUNDARY_ERROR_CODES } from './constants.js';
import { RagError } from './errors.js';

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
  const { data, error } = await supabase
    .from('curriculum_nodes')
    .select('node_id, topic_path, syllabus_code, subject_code, title, description')
    .eq('node_id', nodeId)
    .maybeSingle();

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

