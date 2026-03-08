/**
 * Client contract tests for js/groq-ai.js.
 * Ensures that when the API is unavailable (501, 5xx, or network error), the client
 * resolves to { error } so the UI can show a message instead of throwing.
 * Run: node --test tests/groq-ai-client.test.mjs
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const groqAiPath = join(__dirname, '../js/groq-ai.js');
const groqAiSource = readFileSync(groqAiPath, 'utf8');

/**
 * Run the groq-ai.js IIFE in a minimal window + fetch environment and return the globals it sets.
 */
function loadGroqAiClient(fetchImpl) {
  const window = { location: { origin: 'http://localhost:8000' } };
  globalThis.window = window;
  globalThis.fetch = fetchImpl;
  const fn = new Function('window', 'fetch', groqAiSource + '\nreturn { askGroq: window.askGroq, callGroq: window.callGroq, getGroqStatus: window.getGroqStatus };');
  return fn(window, fetchImpl);
}

describe('groq-ai client contract', () => {
  afterEach(() => {
    delete globalThis.window;
  });

  describe('askGroq', () => {
    it('returns { error } when server returns 501 (Unsupported method)', async () => {
      const fetchImpl = async () => ({ ok: false, status: 501, json: async () => ({ error: 'Unsupported method (\'POST\')' }) });
      const { askGroq } = loadGroqAiClient(fetchImpl);
      const result = await askGroq([{ role: 'user', content: 'hi' }], {});
      assert.ok(result.error, 'expected { error } when API returns 501');
      assert.strictEqual(typeof result.error, 'string');
    });

    it('returns { error } when server returns 500', async () => {
      const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({ error: 'Groq API not configured' }) });
      const { askGroq } = loadGroqAiClient(fetchImpl);
      const result = await askGroq([{ role: 'user', content: 'hi' }], {});
      assert.ok(result.error);
    });

    it('returns { error } when fetch throws (network error)', async () => {
      const fetchImpl = async () => { throw new Error('Failed to fetch'); };
      const { askGroq } = loadGroqAiClient(fetchImpl);
      const result = await askGroq([{ role: 'user', content: 'hi' }], {});
      assert.ok(result.error);
    });

    it('returns { content } when server returns 200 with choices', async () => {
      const fetchImpl = async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Hello' } }] }),
      });
      const { askGroq } = loadGroqAiClient(fetchImpl);
      const result = await askGroq([{ role: 'user', content: 'hi' }], {});
      assert.strictEqual(result.content, 'Hello');
      assert.strictEqual(result.error, undefined);
    });
  });

  describe('getGroqStatus', () => {
    it('returns { groq: true } when GET ?status=1 returns 200 and groq: true', async () => {
      const fetchImpl = async (url) => {
        if (String(url).includes('status=1')) {
          return { ok: true, json: async () => ({ groq: true }) };
        }
        return { ok: false, status: 501 };
      };
      const { getGroqStatus } = loadGroqAiClient(fetchImpl);
      const status = await getGroqStatus();
      assert.strictEqual(status.groq, true);
    });

    it('returns { groq: false } when GET fails or returns groq: false', async () => {
      const fetchImpl = async () => ({ ok: false });
      const { getGroqStatus } = loadGroqAiClient(fetchImpl);
      const status = await getGroqStatus();
      assert.strictEqual(status.groq, false);
    });
  });

  describe('callGroq', () => {
    it('throws when server returns 501 (dashboard-style one-shot)', async () => {
      const fetchImpl = async () => ({ ok: false, status: 501, json: async () => ({ error: 'Unsupported method' }) });
      const { callGroq } = loadGroqAiClient(fetchImpl);
      await assert.rejects(async () => {
        await callGroq('Hello', 'You are helpful.', {});
      }, /Unsupported method|Request failed|error/i);
    });

    it('returns text string when server returns 200 and { text }', async () => {
      const fetchImpl = async () => ({ ok: true, json: async () => ({ text: 'Reply here' }) });
      const { callGroq } = loadGroqAiClient(fetchImpl);
      const text = await callGroq('Hello', '', {});
      assert.strictEqual(text, 'Reply here');
    });
  });
});
