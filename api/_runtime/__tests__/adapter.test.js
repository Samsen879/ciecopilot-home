import { Readable } from 'node:stream';
import { adaptRequestBasics, ensureParsedJsonBody } from '../request-adapter.js';
import { adaptResponse } from '../response-adapter.js';

function createReq({
  method = 'GET',
  url = '/api/test',
  headers = {},
  body = null,
} = {}) {
  const req = new Readable({ read() {} });
  req.method = method;
  req.url = url;
  req.headers = headers;
  if (body !== null) {
    req.push(body);
  }
  req.push(null);
  return req;
}

function createRes() {
  const headers = new Map();
  return {
    statusCode: 200,
    headersSent: false,
    ended: false,
    payload: null,
    setHeader(key, value) {
      headers.set(String(key).toLowerCase(), value);
    },
    getHeader(key) {
      return headers.get(String(key).toLowerCase());
    },
    end(payload) {
      this.ended = true;
      this.payload = payload;
      this.headersSent = true;
    },
  };
}

describe('runtime request/response adapter', () => {
  it('parses query with URLSearchParams and preserves multi-value arrays', () => {
    const req = createReq({
      url: '/api/evidence/context?topic_path=9709.algebra&tag=a&tag=b',
      headers: { 'x-request-id': 'req-1' },
    });
    adaptRequestBasics(req);
    expect(req.path).toBe('/api/evidence/context');
    expect(req.query.topic_path).toBe('9709.algebra');
    expect(req.query.tag).toEqual(['a', 'b']);
    expect(req.request_id).toBe('req-1');
  });

  it('parses json body for non-express handlers', async () => {
    const req = createReq({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    });
    adaptRequestBasics(req);
    const body = await ensureParsedJsonBody(req);
    expect(body).toEqual({ foo: 'bar' });
  });

  it('throws bad_json_payload for invalid json', async () => {
    const req = createReq({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"x":',
    });
    adaptRequestBasics(req);
    await expect(ensureParsedJsonBody(req)).rejects.toMatchObject({
      status: 400,
      code: 'bad_json_payload',
    });
  });

  it('injects status/json/send helpers and request id', () => {
    const res = createRes();
    adaptResponse(res, 'req-2');
    res.status(201).json({ ok: true });
    expect(res.statusCode).toBe(201);
    expect(res.getHeader('x-request-id')).toBe('req-2');
    expect(JSON.parse(res.payload)).toEqual({ ok: true });
  });
});

