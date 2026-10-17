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

export function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** Read and parse a JSON body, enforcing content type and a size limit. */
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

/** Sliding-window limiter keyed by client. `hit` returns true when the client is over the limit. */
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

/** Behind a trusted proxy the last X-Forwarded-For entry is the address the proxy saw. */
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

/**
 * Preload every file under `root` into memory (with gzip and ETag).
 * Lookup is by exact URL path, so path traversal is impossible by construction.
 */
export function loadStatic(root) {
  const files = new Map();
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const buf = fs.readFileSync(full);
      const type = TYPES[path.extname(entry.name)] || 'application/octet-stream';
      files.set('/' + path.relative(root, full).split(path.sep).join('/'), {
        buf,
        type,
        gz: COMPRESSIBLE.test(type) ? zlib.gzipSync(buf) : null,
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

export function serveStatic(entry, req, res) {
  const headers = { 'Content-Type': entry.type, ETag: entry.etag, 'Cache-Control': 'no-cache', Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === entry.etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  const gzip = entry.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const body = gzip ? entry.gz : entry.buf;
  if (gzip) headers['Content-Encoding'] = 'gzip';
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}
