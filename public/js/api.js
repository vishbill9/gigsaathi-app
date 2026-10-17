// Browser-side calls to the GigSaathi server.
import { S } from './state.js';

const send = (method, url, body) => fetch(url, {
  method,
  headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

async function json(res) {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.json();
}

// ---- AI
/** Raw streaming response from /api/chat (plain text chunks). */
export const chatStream = (module, messages, context = '') => send('POST', '/api/chat', { module, lang: S.lang, messages, context });

/** Whole reply as text, for short one-shot modules like surprises. */
export async function chatText(module, messages, context = '') {
  const res = await chatStream(module, messages, context);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'request failed');
  return { text: await res.text() };
}

export async function parseEntry(text) {
  return json(await send('POST', '/api/parse', { text }));
}

/** Which module should handle this message? Falls back to the friendly buddy. */
export async function routeText(text) {
  try {
    const res = await send('POST', '/api/route', { text });
    if (res.ok) return await res.json();
  } catch { /* offline: use the default */ }
  return { module: 'buddy', log: false };
}

// ---- Your data (stored in the server database, tied to an anonymous cookie)
/** Load this worker's saved entries, moods and document summary into the UI state. */
export async function loadRemote() {
  try {
    const data = await json(await send('GET', '/api/state'));
    S.ledger = data.entries;
    S.moods = data.moods;
    S.docSummary = data.docSummary;
    return true;
  } catch {
    return false;
  }
}

export const saveEntry = async entry => json(await send('POST', '/api/entries', entry));
export const removeEntry = async id => json(await send('DELETE', `/api/entries/${id}`));
export const saveMood = async (date, score) => json(await send('POST', '/api/moods', { date, score }));
export const saveDocSummary = async text => json(await send('PUT', '/api/doc-summary', { text }));
export const deleteAllData = async () => json(await send('DELETE', '/api/me'));
