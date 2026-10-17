// UI state. Earnings, moods and the document summary come from the server database (see api.js loadRemote).
// Only the language and Easy-mode preferences live in this browser.
const LANGS = ['en', 'hi', 'pa', 'hing'];

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const lang = read('lang', 'en');

export const S = {
  lang: LANGS.includes(lang) ? lang : 'en',
  big: read('big', false) === true,
  ledger: [],
  moods: [],
  docSummary: '',
  hist: {}, // per-module chat history for the current visit
};

/** Save the named preference keys ('lang' or 'big'). Storage can be blocked, so failures are ignored. */
export function persist(...keys) {
  for (const key of keys) {
    try { localStorage.setItem(key, JSON.stringify(S[key])); } catch { /* storage unavailable */ }
  }
}
