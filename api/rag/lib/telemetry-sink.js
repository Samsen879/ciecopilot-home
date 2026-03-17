import { createRagTelemetryJsonlSink } from './telemetry-jsonl-sink.js';

function createNoopSink() {
  return {
    type: 'noop',
    async writeEvent() {
      return null;
    },
  };
}

export function getRagTelemetrySink({ cwd = process.cwd(), now, env = process.env } = {}) {
  const configuredType = String(env?.RAG_TELEMETRY_SINK || 'jsonl')
    .trim()
    .toLowerCase();

  if (configuredType === 'none' || configuredType === 'noop') {
    return createNoopSink();
  }

  return createRagTelemetryJsonlSink({ cwd, now });
}
