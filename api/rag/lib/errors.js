export class RagError extends Error {
  constructor({ status = 500, code = 'RAG_INTERNAL_ERROR', message = 'RAG internal error', details } = {}) {
    super(message);
    this.name = 'RagError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function cloneDetails(details) {
  if (typeof details === 'undefined') return null;
  if (details === null) return null;
  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    return {
      non_serializable_details: String(details),
    };
  }
}

export function toRagError(error, fallback = {}) {
  if (error instanceof RagError) return error;
  return new RagError({
    status: fallback.status || 500,
    code: fallback.code || 'RAG_INTERNAL_ERROR',
    message: error?.message || fallback.message || 'RAG internal error',
    details: fallback.details,
  });
}

export function toRagErrorAudit(error, { stage = null } = {}) {
  if (!error) {
    return {
      error_stage: stage,
      error_code: null,
      error_status: null,
      error_message: null,
      error_details: null,
    };
  }

  if (error instanceof RagError) {
    return {
      error_stage: stage,
      error_code: error.code || 'RAG_INTERNAL_ERROR',
      error_status: Number.isFinite(Number(error.status)) ? Number(error.status) : null,
      error_message: String(error.message || ''),
      error_details: cloneDetails(error.details),
    };
  }

  return {
    error_stage: stage,
    error_code: null,
    error_status: null,
    error_message: String(error?.message || error || ''),
    error_details: null,
  };
}
