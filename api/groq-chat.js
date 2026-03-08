/**
 * Serverless proxy for Groq chat completions. Keeps GROQ_API_KEY server-side.
 * Aligned with dashboard (pages/api/llm.ts) and PostPal (pages/api/llm.js) patterns.
 *
 * GET ?status=1  → { groq: boolean } (PostPal-style)
 * POST body (dashboard-style): { prompt, systemInstruction?, modelType?, model? } → { text }
 * POST body (chat-style):      { messages, systemPrompt?, modelIndex? }           → full Groq response
 *
 * Env: GROQ_API_KEY, GROQ_MODELS (JSON array), GROQ_MODEL_DEFAULT_INDEX
 *      Legacy: GROQ_MODEL_SIMPLE, GROQ_MODEL, GROQ_MODEL_ADVANCED (dashboard compat)
 */

const GROQ_URL = process.env.GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions';

const DEFAULT_MODELS = {
  basic: 'llama-3.1-8b-instant',
  medium: 'openai/gpt-oss-20b',
  advanced: 'openai/gpt-oss-120b',
};

function resolveModels() {
  const raw = process.env.GROQ_MODELS || process.env.VITE_GROQ_MODELS || process.env.NEXT_PUBLIC_GROQ_MODELS;
  const list = [DEFAULT_MODELS.basic, DEFAULT_MODELS.medium, DEFAULT_MODELS.advanced];
  const legacy = {
    basic: process.env.GROQ_MODEL_SIMPLE || process.env.VITE_GROQ_MODEL_SIMPLE || process.env.NEXT_PUBLIC_GROQ_MODEL_SIMPLE,
    medium: process.env.GROQ_MODEL || process.env.VITE_GROQ_MODEL || process.env.NEXT_PUBLIC_GROQ_MODEL,
    advanced: process.env.GROQ_MODEL_ADVANCED || process.env.VITE_GROQ_MODEL_ADVANCED || process.env.NEXT_PUBLIC_GROQ_MODEL_ADVANCED,
  };
  if (legacy.basic) list[0] = legacy.basic;
  if (legacy.medium) list[1] = legacy.medium;
  if (legacy.advanced) list[2] = legacy.advanced;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((v, i) => { if (typeof v === 'string' && v.trim()) list[i] = v; });
      }
    } catch (_) {}
  }
  const defaultIndex = Number(process.env.GROQ_MODEL_DEFAULT_INDEX || process.env.VITE_GROQ_MODEL_DEFAULT_INDEX || process.env.NEXT_PUBLIC_GROQ_MODEL_DEFAULT_INDEX) || 0;
  const defaultKey = (process.env.GROQ_MODEL_DEFAULT || process.env.VITE_GROQ_MODEL_DEFAULT || 'basic').toLowerCase();
  const map = { basic: list[0], medium: list[1], advanced: list[2], simple: list[0], 0: list[0], 1: list[1], 2: list[2] };
  const defaultModel = list[defaultIndex] ?? map[defaultKey] ?? list[0];
  return { list, map, defaultModel };
}

const MODELS = resolveModels();

function getResolvedModel(body) {
  if (body.model && typeof body.model === 'string') return body.model;
  const t = (body.modelType || '').toLowerCase();
  if (t) return MODELS.map[t] || MODELS.defaultModel;
  const idx = typeof body.modelIndex === 'number' && body.modelIndex >= 0 ? body.modelIndex : null;
  if (idx !== null) return MODELS.list[idx] ?? MODELS.defaultModel;
  return MODELS.defaultModel;
}

function cors(res, origin) {
  const allow = origin && /^https?:\/\/(localhost|thelivingway\.app)(:\d+)?$/.test(origin)
    ? origin
    : 'https://thelivingway.app';
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  cors(res, req.headers.origin);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // GET ?status=1 — PostPal-style provider status
  if (req.method === 'GET' && req.query && req.query.status) {
    const groq = Boolean(process.env.GROQ_API_KEY);
    return res.status(200).json({ groq });
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Groq API not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Dashboard-style: prompt + systemInstruction → return { text }
  if (body.prompt != null && typeof body.prompt === 'string') {
    const systemInstruction = body.systemInstruction && typeof body.systemInstruction === 'string' ? body.systemInstruction : '';
    const model = getResolvedModel(body);
    const messages = [];
    if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
    messages.push({ role: 'user', content: body.prompt });

    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.2 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status || 500).json(data || { error: 'Groq request failed' });
      }
      const text = data?.choices?.[0]?.message?.content ?? '';
      return res.status(200).json({ text });
    } catch (err) {
      return res.status(502).json({ error: err.message || 'Upstream error' });
    }
  }

  // Chat-style: messages array
  const { messages = [], systemPrompt, modelIndex } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required and non-empty, or provide prompt for one-shot' });
  }

  const model = getResolvedModel({ modelIndex });
  const fullMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json(data || { error: 'Groq request failed' });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Upstream error' });
  }
}
