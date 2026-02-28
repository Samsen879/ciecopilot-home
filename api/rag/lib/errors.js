export class RagError extends Error {
  constructor({ status = 500, code = 'RAG_INTERNAL_ERROR', message = 'RAG internal error', details } = {}) {
    super(message);
    this.name = 'RagError';
    this.status = status;
    this.code = code;
    this.details = details;
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

