/**
 * Groq AI — parallel to ChatGPT link. Same patterns as dashboard (callGroq) and PostPal (status).
 * Set window.LIVING_WAY_GROQ_API to the API base URL if the API is on another origin.
 */

(function () {
  'use strict';

  function getApiBase() {
    if (typeof window.LIVING_WAY_GROQ_API === 'string' && window.LIVING_WAY_GROQ_API) {
      return window.LIVING_WAY_GROQ_API.replace(/\/$/, '');
    }
    return window.location.origin;
  }

  var API_PATH = '/api/groq-chat';

  /**
   * GET ?status=1 — PostPal-style. Returns { groq: boolean }.
   * @returns {Promise<{ groq: boolean }>}
   */
  window.getGroqStatus = function () {
    var base = getApiBase();
    return fetch(base + API_PATH + '?status=1')
      .then(function (r) { return r.json(); })
      .catch(function () { return { groq: false }; });
  };

  /**
   * Dashboard-style one-shot call: prompt + systemInstruction → returns text string.
   * @param {string} prompt
   * @param {string} [systemInstruction]
   * @param {{ modelType?: string, model?: string }} [options]
   * @returns {Promise<string>}
   */
  window.callGroq = function (prompt, systemInstruction, options) {
    var base = getApiBase();
    var body = { prompt: prompt, systemInstruction: systemInstruction || '', modelType: (options && options.modelType) || 'basic' };
    if (options && options.model) body.model = options.model;
    return fetch(base + API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        return data.text || '';
      });
  };

  /**
   * Chat-style multi-turn: messages array + optional systemPrompt. Returns { content } or { error }.
   * @param {Array<{ role: string, content: string }>} messages
   * @param {{ systemPrompt?: string, modelIndex?: number }} options
   * @returns {Promise<{ content?: string, error?: string }>}
   */
  window.askGroq = function (messages, options) {
    var base = getApiBase();
    var url = base + API_PATH;
    var body = JSON.stringify({
      messages: messages,
      systemPrompt: options && options.systemPrompt,
      modelIndex: options && options.modelIndex
    });
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || data.message || 'Request failed');
          return data;
        });
      })
      .then(function (data) {
        var choice = data.choices && data.choices[0];
        var content = choice && choice.message && choice.message.content;
        return { content: content || '' };
      })
      .catch(function (err) {
        return { error: err.message || 'Unable to reach AI.' };
      });
  };

  /** Default system prompt for the Living Way / Yeshua voice */
  window.LIVING_WAY_GROQ_SYSTEM = 'You are a calm, non-dogmatic spiritual guide in the tradition of The Living Way. You speak in short, clear sentences. You mirror rather than judge. You draw on wisdom traditions (Yeshua, Laozi, Gotama, etc.) when helpful, without preaching.';

  /** Teacher-specific system prompts for companion voices */
  window.LIVING_WAY_GROQ_TEACHERS = {
    yeshua: window.LIVING_WAY_GROQ_SYSTEM,
    gotama: 'You speak as a guide in the spirit of the Buddha and the Dhammapada of the Living Way. Calm, direct, focused on awakening and the end of suffering. Short, clear answers.',
    laozi: 'You speak in the spirit of the Tao Te Ching and the Unforced Leader. Paradox, simplicity, and non-action. Short, poetic, mirror-like.',
    krishna: 'You speak as a guide in the spirit of the Gita of the Living Way. Steady, compassionate, about right action and inner stillness. Short, clear.',
    einstein: 'You speak as a guide blending scientific clarity with the wisdom of The Unified Field Papers. Precise, wonder-filled, non-dogmatic.',
    musashi: 'You speak in the spirit of the Warrior Path of the Living Way: discipline under pressure, timing, adaptation, and emptiness. Direct, spare, no theatrics—attention as training, reactivity as the foe. Short, clear answers.'
  };

  /**
   * Open a simple in-page chat panel that uses Groq with an optional teacher key.
   * @param {string} [teacherKey] - One of: yeshua, gotama, laozi, krishna, einstein, musashi
   */
  window.openGroqChat = function (teacherKey) {
    var teachers = window.LIVING_WAY_GROQ_TEACHERS || {};
    var systemPrompt = (teacherKey && teachers[teacherKey]) ? teachers[teacherKey] : teachers.yeshua || window.LIVING_WAY_GROQ_SYSTEM;

    var existing = document.getElementById('groq-chat-panel');
    if (existing) {
      existing.classList.toggle('groq-chat-open');
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'groq-chat-panel';
    panel.className = 'groq-chat-panel groq-chat-open';
    panel.innerHTML =
      '<div class="groq-chat-header">' +
        '<span class="groq-chat-title">Ask with Groq</span>' +
        '<button type="button" class="groq-chat-close" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="groq-chat-messages"></div>' +
      '<div class="groq-chat-form">' +
        '<textarea class="groq-chat-input" rows="2" placeholder="Ask anything..." aria-label="Your message"></textarea>' +
        '<button type="button" class="groq-chat-send">Send</button>' +
      '</div>';

    var messagesEl = panel.querySelector('.groq-chat-messages');
    var inputEl = panel.querySelector('.groq-chat-input');
    var sendBtn = panel.querySelector('.groq-chat-send');

    function appendMessage(role, text) {
      var div = document.createElement('div');
      div.className = 'groq-chat-msg groq-chat-msg-' + role;
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function setLoading(on) {
      sendBtn.disabled = on;
      sendBtn.textContent = on ? '…' : 'Send';
    }

    function send() {
      var text = (inputEl.value || '').trim();
      if (!text) return;
      inputEl.value = '';
      appendMessage('user', text);
      setLoading(true);
      var history = [];
      panel.querySelectorAll('.groq-chat-msg-user').forEach(function (el) {
        history.push({ role: 'user', content: el.textContent });
      });
      panel.querySelectorAll('.groq-chat-msg-assistant').forEach(function (el) {
        history.push({ role: 'assistant', content: el.textContent });
      });
      window.askGroq(history, { systemPrompt: systemPrompt })
        .then(function (out) {
          setLoading(false);
          if (out.error) appendMessage('assistant', 'Error: ' + out.error);
          else if (out.content) appendMessage('assistant', out.content);
        })
        .catch(function () {
          setLoading(false);
          appendMessage('assistant', 'Something went wrong. Please try again.');
        });
    }

    panel.querySelector('.groq-chat-close').addEventListener('click', function () {
      panel.classList.remove('groq-chat-open');
    });
    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    document.body.appendChild(panel);

    var style = document.getElementById('groq-chat-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'groq-chat-styles';
      style.textContent =
        '.groq-chat-panel{position:fixed;right:1rem;bottom:1rem;width:340px;max-width:calc(100vw - 2rem);max-height:70vh;background:rgba(253,251,247,0.98);border:1px solid rgba(140,123,108,0.25);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.15);z-index:1001;display:flex;flex-direction:column;font-family:inherit;}' +
        '.groq-chat-panel:not(.groq-chat-open){display:none;}' +
        '.groq-chat-header{display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid rgba(140,123,108,0.2);}' +
        '.groq-chat-title{font-weight:600;color:#2c2c2c;}' +
        '.groq-chat-close{background:none;border:none;font-size:1.5rem;line-height:1;cursor:pointer;color:#5a5a5a;padding:0 .25rem;}' +
        '.groq-chat-close:hover{color:#2c2c2c;}' +
        '.groq-chat-messages{flex:1;overflow-y:auto;padding:1rem;min-height:120px;}' +
        '.groq-chat-msg{padding:0.5rem 0;border-bottom:1px solid rgba(0,0,0,0.06);}' +
        '.groq-chat-msg-user{color:#2c2c2c;}' +
        '.groq-chat-msg-assistant{color:#5a5a5a;}' +
        '.groq-chat-form{padding:0.75rem;display:flex;gap:0.5rem;align-items:flex-end;border-top:1px solid rgba(140,123,108,0.2);}' +
        '.groq-chat-input{flex:1;resize:none;padding:0.5rem;border:1px solid rgba(140,123,108,0.3);border-radius:6px;font-family:inherit;font-size:0.95rem;}' +
        '.groq-chat-send{padding:0.5rem 1rem;background:rgba(54,43,35,0.95);color:#fdfbf7;border:none;border-radius:6px;cursor:pointer;font-family:inherit;}' +
        '.groq-chat-send:hover:not(:disabled){opacity:0.9;}' +
        '.groq-chat-send:disabled{opacity:0.6;cursor:not-allowed;}';
      document.head.appendChild(style);
    }
  };
})();
