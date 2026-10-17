// Small DOM and formatting helpers shared by every module.
export const $ = (selector, root = document) => root.querySelector(selector);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for safe use inside innerHTML. */
export const esc = text => String(text).replace(/[&<>"']/g, c => ESCAPES[c]);

/** Escape, then allow **bold** only. Model output never becomes raw HTML. */
export const md = text => esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

export const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

let toastTimer;
/** Polite, auto-dismissing status message (announced by screen readers). */
export function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}
