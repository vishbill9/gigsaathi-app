// HTTP helpers: security headers, JSON IO, rate limiting and an in-memory static file server.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { HttpError } from './errors.js';

export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(self), microphone=(self), camera=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Send a JSON response that is never cached.
 * @param {import('node:http').ServerResponse} res
 * @param {number} status HTTP status code
 * @param {unknown} obj Value to serialise
 */
export function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * Read and parse a JSON body, enforcing content type and a size limit.
 * @param {import('node:http').IncomingMessage} req
 * @param {number} [limit] Maximum body size in bytes
 * @returns {Promise<any>}
 * @throws {HttpError} 415 for a wrong content type, 413 when too large, 400 for invalid JSON
 */
export async function readJson(req, limit = 100_000) {
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  // Keep draining (without buffering) so the client can finish sending and receive our 413;
  // give up on the connection entirely if it keeps sending far beyond the limit.
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      tooLarge = true;
      if (size > limit * 20) { req.destroy(); break; }
      continue;
    }
    chunks.push(chunk);
  }
  if (tooLarge) throw new HttpError(413, 'Request is too large');
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

/**
 * Sliding-window limiter keyed by client. `hit` returns true when the client is over the limit.
 * @param {{max?: number, windowMs?: number, now?: () => number}} [options]
 */
export function createLimiter({ max = 40, windowMs = 60_000, now = Date.now } = {}) {
  const hits = new Map();
  const sweep = setInterval(() => {
    const t = now();
    for (const [key, stamps] of hits) if (stamps.every(s => t - s >= windowMs)) hits.delete(key);
  }, windowMs);
  sweep.unref();
  return {
    hit(key) {
      const t = now();
      const stamps = (hits.get(key) || []).filter(s => t - s < windowMs);
      stamps.push(t);
      hits.set(key, stamps);
      return stamps.length > max;
    },
    size: () => hits.size,
    stop: () => clearInterval(sweep),
  };
}

/**
 * Behind a trusted proxy the last X-Forwarded-For entry is the address the proxy saw.
 * @param {import('node:http').IncomingMessage} req
 * @param {boolean} [trustProxy]
 */
export function clientIp(req, trustProxy = false) {
  const forwarded = req.headers['x-forwarded-for'];
  if (trustProxy && typeof forwarded === 'string' && forwarded) return forwarded.split(',').at(-1).trim();
  return req.socket.remoteAddress || 'unknown';
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = /^(text\/|application\/json|image\/svg)/;
const BROTLI = { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } };
const IMMUTABLE_TYPES = /^image\//;

/**
 * Preload every file under `root` into memory, pre-compressed with Brotli and gzip, plus an ETag.
 * Compressing once at start-up means requests cost no CPU. Lookup is by exact URL path,
 * so path traversal is impossible by construction.
 * @param {string} root Directory to serve
 */
export function loadStatic(root) {
  const files = new Map();
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const buf = fs.readFileSync(full);
      const type = TYPES[path.extname(entry.name)] || 'application/octet-stream';
      const compress = COMPRESSIBLE.test(type);
      files.set('/' + path.relative(root, full).split(path.sep).join('/'), {
        buf,
        type,
        br: compress ? zlib.brotliCompressSync(buf, BROTLI) : null,
        gz: compress ? zlib.gzipSync(buf, { level: 9 }) : null,
        etag: `"${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16)}"`,
      });
    }
  };
  walk(root);
  return {
    size: files.size,
    get(urlPath) {
      let p;
      try { p = decodeURIComponent(urlPath); } catch { return null; }
      return files.get(p === '/' ? '/index.html' : p) ?? null;
    },
  };
}

/**
 * Serve a preloaded static file: 304 when the ETag matches, otherwise the best encoding the client accepts.
 * Code is revalidated on every load (so a deploy shows at once); images are cached for a day.
 * @param {{buf: Buffer, br: Buffer|null, gz: Buffer|null, type: string, etag: string}} entry
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export function serveStatic(entry, req, res) {
  const cache = IMMUTABLE_TYPES.test(entry.type) ? 'public, max-age=86400' : 'no-cache';
  const headers = { 'Content-Type': entry.type, ETag: entry.etag, 'Cache-Control': cache, Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === entry.etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  const accepted = req.headers['accept-encoding'] || '';
  let body = entry.buf;
  if (entry.br && /\bbr\b/.test(accepted)) { body = entry.br; headers['Content-Encoding'] = 'br'; }
  else if (entry.gz && /\bgzip\b/.test(accepted)) { body = entry.gz; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}
