import { safeLog } from '../../lib/security/redaction.js';
import {
  buildRagRequestTelemetryFailureEvent,
  buildRagRequestTelemetrySuccessEvent,
} from './telemetry-schema.js';
import { getRagTelemetrySink } from './telemetry-sink.js';

async function writeEventBestEffort(event, { sink = getRagTelemetrySink(), logger = safeLog } = {}) {
  try {
    await sink.writeEvent(event);
    return event;
  } catch {
    logger('warn', 'rag_request_telemetry_sink_failed', {
      request_id: event?.request_id || null,
      endpoint: event?.endpoint || null,
      method: event?.method || null,
      sink_type: sink?.type || 'unknown',
    });
    return null;
  }
}

export async function recordRagTelemetrySuccess(payload, options = {}) {
  const event = buildRagRequestTelemetrySuccessEvent(payload);
  return writeEventBestEffort(event, options);
}

export async function recordRagTelemetryFailure(payload, options = {}) {
  const event = buildRagRequestTelemetryFailureEvent(payload);
  return writeEventBestEffort(event, options);
}
