// Strict request validation. Everything from the browser is untrusted.
import { HttpError } from './errors.js';
import { LANGS, MODULES } from './prompts.js';

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 4000;
const MAX_CONTEXT_CHARS = 3000;
const DAY_MS = 86_400_000;

/** @returns {{module: string, lang: string, messages: {role: string, content: string}[], context: string}} */
export function validateChat(body) {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Invalid request');
  if (!Object.hasOwn(MODULES, body.module)) throw new HttpError(400, 'Unknown module');
  const lang = Object.hasOwn(LANGS, body.lang) ? body.lang : 'en';
  if (!Array.isArray(body.messages) || body.messages.length === 0) throw new HttpError(400, 'messages are required');

  const messages = body.messages.slice(-MAX_MESSAGES).map(m => {
    const valid = m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim();
    if (!valid) throw new HttpError(400, 'Invalid message');
    return { role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) };
  });
  if (messages.at(-1).role !== 'user') throw new HttpError(400, 'The last message must be from the user');

  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT_CHARS) : '';
  return { module: body.module, lang, messages, context };
}

/** For /api/parse and /api/route. */
export function validateText(body, max = 1000) {
  if (!body || typeof body.text !== 'string' || !body.text.trim()) throw new HttpError(400, 'text is required');
  return body.text.slice(0, max);
}

/** A real calendar day within the last year and at most two days ahead (time zones). */
export function validDate(value, now = Date.now()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== value) return false;
  return t <= now + 2 * DAY_MS && t >= now - 366 * DAY_MS;
}

const whole = (value, max, name) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new HttpError(400, `Invalid ${name}`);
  return Math.round(n);
};

/** Validate and normalise one earnings entry. */
export function validateEntry(body, now = Date.now()) {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Invalid request');
  if (!validDate(body.date, now)) throw new HttpError(400, 'Invalid date');
  const hours = Number(body.hours ?? 0);
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) throw new HttpError(400, 'Invalid hours');
  const entry = {
    date: body.date,
    platform: String(body.platform ?? '').replace(/[^\p{L}\p{N} .&'-]/gu, '').trim().slice(0, 30),
    orders: whole(body.orders, 1000, 'orders'),
    income: whole(body.income, 1_000_000, 'income'),
    fuel: whole(body.fuel, 1_000_000, 'fuel'),
    other: whole(body.other, 1_000_000, 'other costs'),
    hours: Math.round(hours * 10) / 10,
  };
  if (!entry.orders && !entry.income) throw new HttpError(400, 'An entry needs orders or income');
  return entry;
}

export function validateMood(body, now = Date.now()) {
  if (!body || !Number.isInteger(body.score) || body.score < 1 || body.score > 5) throw new HttpError(400, 'Invalid mood');
  if (!validDate(body.date, now)) throw new HttpError(400, 'Invalid date');
  return { date: body.date, score: body.score };
}

export function validateSummary(body) {
  if (!body || typeof body.text !== 'string' || !body.text.trim()) throw new HttpError(400, 'text is required');
  return body.text.slice(0, 3000);
}
