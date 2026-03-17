import fs from 'node:fs/promises';
import path from 'node:path';

function resolveNow(now) {
  if (typeof now === 'function') return now();
  if (now instanceof Date) return now;
  return new Date();
}

function toUtcDatePart(now) {
  const resolved = resolveNow(now);
  const year = resolved.getUTCFullYear();
  const month = String(resolved.getUTCMonth() + 1).padStart(2, '0');
  const day = String(resolved.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildRagTelemetryJsonlPath({ cwd = process.cwd(), now } = {}) {
  return path.join(
    cwd,
    'runs',
    'backend',
    'telemetry',
    `rag_request_events_${toUtcDatePart(now)}.jsonl`,
  );
}

export function createRagTelemetryJsonlSink({ cwd = process.cwd(), now } = {}) {
  return {
    type: 'jsonl',
    async writeEvent(event) {
      const outputPath = buildRagTelemetryJsonlPath({ cwd, now });
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.appendFile(outputPath, `${JSON.stringify(event)}\n`, 'utf8');
      return outputPath;
    },
  };
}
