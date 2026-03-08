/**
 * API handler tests for api/groq-chat.js.
 * Catches: wrong method (405), missing key (500), validation (400), and success contract (200 + shape).
 * Run: node --test tests/api/groq-chat.test.mjs
 */

import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

const originalFetch = globalThis.fetch;

function createRes() {
  const out = { _status: null, _body: null, _ended: false };
  const res = {
    setHeader: mock.fn(),
    status(code) {
      out._status = code;
      return res;
    },
    json(body) {
      out._body = body;
      out._ended = true;
      return res;
    },
    end() {
      out._ended = true;
    },
    get _out() {
      return out;
    },
  };
  return res;
}

async function loadHandler() {
  return (await import('../../api/groq-chat.js')).default;
}

describe('api/groq-chat', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = '';
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  describe('OPTIONS', () => {
    it('returns 204 and sets CORS', async () => {
      const handler = await loadHandler();
      const req = { method: 'OPTIONS', headers: { origin: 'http://localhost:8000' } };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 204);
      assert.strictEqual(res.setHeader.mock.calls.length, 4);
    });
  });

  describe('GET ?status=1', () => {
    it('returns { groq: false } when GROQ_API_KEY is not set', async () => {
      const handler = await loadHandler();
      const req = { method: 'GET', query: { status: '1' }, headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 200);
      assert.deepStrictEqual(res._out._body, { groq: false });
    });

    it('returns { groq: true } when GROQ_API_KEY is set', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      const handler = await loadHandler();
      const req = { method: 'GET', query: { status: '1' }, headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 200);
      assert.deepStrictEqual(res._out._body, { groq: true });
    });
  });

  describe('POST method', () => {
    it('returns 405 for GET without status (no status query)', async () => {
      const handler = await loadHandler();
      const req = { method: 'GET', query: {}, headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 405);
      assert.deepStrictEqual(res._out._body, { error: 'Method not allowed' });
    });

    it('returns 405 for GET with wrong path (query not status)', async () => {
      const handler = await loadHandler();
      const req = { method: 'GET', query: { foo: '1' }, headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 405);
    });

    it('returns 500 when GROQ_API_KEY is missing and POST with prompt', async () => {
      const handler = await loadHandler();
      const req = { method: 'POST', body: { prompt: 'Hi' }, headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 500);
      assert.strictEqual(res._out._body?.error, 'Groq API not configured');
    });

    it('returns 400 for invalid JSON body (string that fails parse)', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      const handler = await loadHandler();
      const req = { method: 'POST', body: 'not valid json {{{', headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 400);
      assert.strictEqual(res._out._body?.error, 'Invalid JSON body');
    });

    it('returns 400 when POST has neither prompt nor valid messages', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      const handler = await loadHandler();
      const req = { method: 'POST', body: { messages: [] }, headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 400);
      assert.ok(res._out._body?.error?.includes('messages') || res._out._body?.error?.includes('prompt'));
    });

    it('dashboard-style: POST with prompt returns 200 and { text } when Groq responds ok', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      globalThis.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Hello back' } }] }),
      }));
      const handler = await loadHandler();
      const req = { method: 'POST', body: { prompt: 'Hello', systemInstruction: 'You are helpful.' }, headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 200);
      assert.strictEqual(res._out._body?.text, 'Hello back');
    });

    it('chat-style: POST with messages returns 200 and full Groq shape when Groq responds ok', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      const groqPayload = { choices: [{ message: { role: 'assistant', content: 'Chat reply' } }] };
      globalThis.fetch = mock.fn(async () => ({ ok: true, json: async () => groqPayload }));
      const handler = await loadHandler();
      const req = { method: 'POST', body: { messages: [{ role: 'user', content: 'Hi' }], systemPrompt: 'Help.' }, headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 200);
      assert.deepStrictEqual(res._out._body, groqPayload);
    });

    it('returns 502 when upstream fetch throws', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      globalThis.fetch = mock.fn(async () => { throw new Error('Network error'); });
      const handler = await loadHandler();
      const req = { method: 'POST', body: { prompt: 'Hi' }, headers: {} };
      const res = createRes();
      await handler(req, res);
      assert.strictEqual(res._out._status, 502);
      assert.ok(res._out._body?.error);
    });
  });
});
