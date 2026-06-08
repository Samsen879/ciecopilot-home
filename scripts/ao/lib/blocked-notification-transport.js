function normalizeString(value) {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : null;
}

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function normalizeWebhookKind(value) {
  const normalized = String(value ?? 'wecom').trim().toLowerCase();
  return normalized === '' ? 'wecom' : normalized;
}

function buildBlockedMarkdown({
  projectId,
  prNumber,
  actionId,
  summary,
  dedupeMarker,
  timestamp,
} = {}) {
  return [
    'AO blocked and needs human input.',
    '',
    `Project: ${projectId ?? 'unknown'}`,
    `PR: ${prNumber == null ? 'unknown' : `#${prNumber}`}`,
    `Action: ${actionId ?? 'unknown'}`,
    `Marker: ${dedupeMarker ?? 'missing'}`,
    `Observed at: ${timestamp ?? 'unknown'}`,
    '',
    summary ?? 'Inspect AO state before resuming automation.',
  ].join('\n');
}

function buildWebhookBody(kind, payload) {
  const markdown = buildBlockedMarkdown(payload);
  if (kind === 'wecom') {
    return {
      msgtype: 'markdown',
      markdown: {
        content: markdown,
      },
    };
  }

  return {
    event: 'ao_blocked_notification',
    text: markdown,
  };
}

function createResult({
  status,
  kind,
  attempts,
  httpStatus = null,
  reason = null,
} = {}) {
  return {
    status,
    transport: 'webhook',
    webhook_kind: kind,
    attempts,
    ...(httpStatus == null ? {} : { http_status: httpStatus }),
    ...(reason == null ? {} : { reason }),
  };
}

export function createBlockedNotificationWebhookTransport({
  env = process.env,
  fetchImpl = globalThis.fetch,
  maxAttempts = 2,
} = {}) {
  if (!isEnabled(env?.AO_BLOCKED_NOTIFICATION_WEBHOOK_ENABLED)) return null;

  const webhookUrl = normalizeString(env?.AO_BLOCKED_NOTIFICATION_WEBHOOK_URL);
  if (!webhookUrl) return null;

  const kind = normalizeWebhookKind(env?.AO_BLOCKED_NOTIFICATION_WEBHOOK_KIND);
  const attempts = Math.max(1, Number.isInteger(maxAttempts) ? maxAttempts : 2);

  return {
    async sendBlockedNotification(payload = {}) {
      if (typeof fetchImpl !== 'function') {
        return createResult({
          status: 'failed',
          kind,
          attempts: 0,
          reason: 'fetch_unavailable',
        });
      }

      let lastStatus = null;
      let lastReason = 'webhook_request_failed';

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const response = await fetchImpl(webhookUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify(buildWebhookBody(kind, payload)),
          });
          lastStatus = response?.status ?? null;
          if (response?.ok === true) {
            return createResult({
              status: 'sent',
              kind,
              attempts: attempt,
              httpStatus: lastStatus,
            });
          }
          lastReason = 'webhook_http_error';
          if (typeof response?.text === 'function') {
            await response.text().catch(() => null);
          }
        } catch {
          lastReason = 'webhook_request_failed';
        }
      }

      return createResult({
        status: 'failed',
        kind,
        attempts,
        httpStatus: lastStatus,
        reason: lastReason,
      });
    },
  };
}
