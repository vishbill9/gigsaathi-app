// Thin client for the Ollama Cloud chat API (https://docs.ollama.com/cloud).
import { getConfig } from './config.js';

const TIMEOUT_MS = 60_000;

async function post(messages, { stream = false, json = false, maxTokens = 1200, signal } = {}) {
  const { key, host, model } = getConfig();
  if (!key) throw new Error('OLLAMA_API_KEY is not set');
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream,
      ...(json ? { format: 'json' } : {}),
      options: { temperature: 0.4, num_predict: maxTokens },
    }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new Error(`upstream status ${res.status}`);
  return res;
}

/** One-shot completion. Throws on any failure so callers can report it honestly. */
export async function chat(messages, { json = false, maxTokens = 800, signal } = {}) {
  const res = await post(messages, { json, maxTokens, signal });
  const out = (await res.json())?.message?.content;
  if (!out?.trim()) throw new Error('empty response');
  return out.trim();
}

/** Streaming completion: yields text chunks as they arrive. */
export async function* chatStream(messages, { maxTokens = 1200, signal } = {}) {
  const res = await post(messages, { stream: true, maxTokens, signal });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.message?.content) yield msg.message.content;
      if (msg.done) return;
    }
  }
}

/** Names of the models this key can use. */
export async function listModels() {
  const { key, host } = getConfig();
  const res = await fetch(`${host}/api/tags`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`upstream status ${res.status}`);
  return ((await res.json()).models ?? []).map(m => m.name);
}

/** Make one real, tiny model call. Used at startup and by /api/health/model to prove the AI path works. */
export async function checkModel() {
  const { key, model } = getConfig();
  if (!key) return { ok: false, model, error: 'OLLAMA_API_KEY is not set' };
  try {
    await chat([{ role: 'user', content: 'Reply with the single word: ready' }], { maxTokens: 300 });
    return { ok: true, model };
  } catch (e) {
    let available;
    try {
      const family = model.split(/[-:]/)[0].toLowerCase();
      available = (await listModels()).filter(n => n.toLowerCase().includes(family)).slice(0, 20);
    } catch { /* listing is best-effort */ }
    return { ok: false, model, error: e.message, available };
  }
}
