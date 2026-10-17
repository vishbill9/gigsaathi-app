// Environment loading and typed configuration. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Load KEY=VALUE pairs from a .env file without overriding real environment variables. */
export function loadEnv(file = path.join(ROOT, '.env')) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

/** Read configuration at call time so tests and hosts can change the environment. */
export function getConfig() {
  const e = process.env;
  const rawKey = (e.OLLAMA_API_KEY || '').trim();
  return {
    key: /^paste_/i.test(rawKey) ? '' : rawKey,
    model: e.OLLAMA_MODEL || 'gpt-oss:120b',
    host: (e.OLLAMA_HOST || 'https://ollama.com').replace(/\/$/, ''),
    port: Number(e.PORT) || 3000,
    dbPath: e.DB_PATH || path.join(ROOT, 'data', 'gigsaathi.db'),
    trustProxy: e.TRUST_PROXY === '1',
    rateLimit: Number(e.RATE_LIMIT_PER_MIN) || 40,
  };
}
