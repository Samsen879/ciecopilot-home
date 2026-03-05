export class QueueEnvelopeError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'QueueEnvelopeError';
    this.code = code;
    this.details = details;
  }
}

