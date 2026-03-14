function normalizeBaseUrl(rawBaseUrl) {
  const fallback = 'http://localhost:3000';
  const candidate = String(rawBaseUrl || fallback).trim() || fallback;
  return candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
}

function getBaseUrl(explicitBaseUrl) {
  return normalizeBaseUrl(explicitBaseUrl || process.env.AUTH_PUBLIC_BASE_URL || process.env.APP_BASE_URL);
}

function getMailerMode() {
  const explicit = String(process.env.AUTH_EMAIL_MODE || '').trim().toLowerCase();
  if (explicit) {
    return explicit;
  }
  if (process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM) {
    return 'resend';
  }
  return 'log';
}

function buildActionUrl(baseUrl, action, paramName, paramValue) {
  const url = new URL('/api/auth', getBaseUrl(baseUrl));
  url.searchParams.set('action', action);
  url.searchParams.set(paramName, paramValue);
  return url.toString();
}

async function sendWithResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    return { delivered: false, mode: 'log', degraded: true, reason: 'resend_config_missing' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend delivery failed: ${response.status} ${body}`);
  }

  return { delivered: true, mode: 'resend', degraded: false };
}

function logDelivery(kind, payload) {
  console.info(payload.link, {
    kind,
    to: payload.to,
    mode: payload.mode,
    subject: payload.subject,
  });
}

async function sendAuthMail(kind, { to, subject, html, link }) {
  const mode = getMailerMode();
  if (mode === 'disabled') {
    logDelivery(kind, { to, subject, link, mode: 'disabled' });
    return { delivered: false, mode: 'disabled', degraded: true };
  }

  if (mode === 'resend') {
    try {
      return await sendWithResend({ to, subject, html });
    } catch (error) {
      console.warn('Auth email provider delivery failed, falling back to log mode:', error.message || error);
    }
  }

  logDelivery(kind, { to, subject, link, mode: 'log' });
  return {
    delivered: false,
    mode: 'log',
    degraded: true,
    preview_url: link,
  };
}

export async function sendVerificationEmail({ to, name, verificationToken, baseUrl }) {
  const link = buildActionUrl(baseUrl, 'verify-email', 'code', verificationToken);
  return sendAuthMail('verification', {
    to,
    subject: 'Verify your CIE Copilot account',
    link,
    html: `<p>Hello ${name || 'there'},</p><p>Verify your email by opening <a href="${link}">${link}</a>.</p>`,
  });
}

export async function sendPasswordResetEmail({ to, name, resetToken, baseUrl }) {
  const link = buildActionUrl(baseUrl, 'reset-password', 'token', resetToken);
  return sendAuthMail('password_reset', {
    to,
    subject: 'Reset your CIE Copilot password',
    link,
    html: `<p>Hello ${name || 'there'},</p><p>Reset your password by opening <a href="${link}">${link}</a>.</p>`,
  });
}

export { buildActionUrl, getBaseUrl, getMailerMode };
