import { describe, expect, it } from '@jest/globals';

import {
  createBlockedNotificationWebhookTransport,
} from '../../scripts/ao/lib/blocked-notification-transport.js';

describe('blocked notification webhook transport', () => {
  it('stays disabled unless explicitly enabled with a webhook URL', () => {
    expect(createBlockedNotificationWebhookTransport({
      env: {},
    })).toBeNull();

    expect(createBlockedNotificationWebhookTransport({
      env: {
        AO_BLOCKED_NOTIFICATION_WEBHOOK_ENABLED: '1',
      },
    })).toBeNull();
  });

  it('sends WeCom-compatible markdown without leaking the webhook URL in the result', async () => {
    const calls = [];
    const transport = createBlockedNotificationWebhookTransport({
      env: {
        AO_BLOCKED_NOTIFICATION_WEBHOOK_ENABLED: '1',
        AO_BLOCKED_NOTIFICATION_WEBHOOK_URL: 'https://hooks.example.test/secret-token',
        AO_BLOCKED_NOTIFICATION_WEBHOOK_KIND: 'wecom',
      },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          status: 200,
          text: async () => '{"errcode":0}',
        };
      },
    });

    const result = await transport.sendBlockedNotification({
      projectId: 'ciecopilot-home',
      prNumber: 411,
      actionId: 'action-blocked-notify',
      summary: 'Notify the human that AO is blocked.',
      dedupeMarker: '<!-- ao:blocked-notification key=ciecopilot-home:pr-411 -->',
      timestamp: '2026-06-08T15:50:00.000Z',
    });

    expect(result).toEqual({
      status: 'sent',
      transport: 'webhook',
      webhook_kind: 'wecom',
      attempts: 1,
      http_status: 200,
    });
    expect(JSON.stringify(result)).not.toContain('secret-token');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://hooks.example.test/secret-token');
    expect(JSON.parse(calls[0].options.body)).toEqual({
      msgtype: 'markdown',
      markdown: {
        content: expect.stringContaining('AO blocked and needs human input'),
      },
    });
  });

  it('retries once and returns a sanitized failure result instead of throwing', async () => {
    const calls = [];
    const transport = createBlockedNotificationWebhookTransport({
      env: {
        AO_BLOCKED_NOTIFICATION_WEBHOOK_ENABLED: '1',
        AO_BLOCKED_NOTIFICATION_WEBHOOK_URL: 'https://hooks.example.test/secret-token',
        AO_BLOCKED_NOTIFICATION_WEBHOOK_KIND: 'wecom',
      },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: false,
          status: 500,
          text: async () => 'upstream exploded with secret-token',
        };
      },
    });

    const result = await transport.sendBlockedNotification({
      projectId: 'ciecopilot-home',
      prNumber: 411,
      actionId: 'action-blocked-notify',
      summary: 'Notify the human that AO is blocked.',
      dedupeMarker: '<!-- ao:blocked-notification key=ciecopilot-home:pr-411 -->',
      timestamp: '2026-06-08T15:50:00.000Z',
    });

    expect(calls).toHaveLength(2);
    expect(result).toEqual({
      status: 'failed',
      transport: 'webhook',
      webhook_kind: 'wecom',
      attempts: 2,
      http_status: 500,
      reason: 'webhook_http_error',
    });
    expect(JSON.stringify(result)).not.toContain('secret-token');
  });
});
