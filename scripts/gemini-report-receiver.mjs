import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const port = Number(process.env.GEMINI_REPORT_PORT || 43129);
const outputDir = path.resolve(process.env.GEMINI_REPORT_DIR || 'deep-reaearch');

fs.mkdirSync(outputDir, { recursive: true });

const respondJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(payload));
};

const buildMarkdown = ({ chatTitle, reportTitle, extractedAt, body, source }) => {
  const lines = [
    `# ${chatTitle}`,
    '',
    `- 原始报告标题：${reportTitle}`,
    `- 来源：${source}`,
    `- 提取日期：${extractedAt}`,
    '',
    body.trim(),
    '',
  ];
  return lines.join('\n');
};

const parsePayload = (req, raw) => {
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('application/json')) {
    return JSON.parse(raw);
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw);
    return JSON.parse(String(params.get('json') || '{}'));
  }
  return JSON.parse(raw);
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    respondJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/save') {
    respondJson(res, 404, { ok: false, error: 'Not found' });
    return;
  }

  let raw = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', () => {
    try {
      const payload = parsePayload(req, raw);
      const chatTitle = String(payload.chatTitle || '').trim();
      const reportTitle = String(payload.reportTitle || '').trim();
      const body = String(payload.body || '').trim();
      const extractedAt = String(payload.extractedAt || '').trim();
      const source = String(payload.source || 'Google Gemini Deep Research').trim();

      if (!chatTitle || !reportTitle || !body || !extractedAt || !source) {
        respondJson(res, 400, { ok: false, error: 'Missing required fields' });
        return;
      }

      const filePath = path.join(outputDir, `${chatTitle}.md`);
      fs.writeFileSync(filePath, buildMarkdown({ chatTitle, reportTitle, extractedAt, body, source }), 'utf8');
      respondJson(res, 200, { ok: true, filePath });
    } catch (error) {
      respondJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Gemini report receiver listening on http://127.0.0.1:${port}`);
  console.log(`Writing reports to ${outputDir}`);
});
