// GigSaathi server: static files, a real SQLite-backed data API and a streaming AI API in front of Ollama Cloud.
// The API key never leaves this process. Node 22.13+, zero dependencies.
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, getConfig } from './lib/config.js';
import * as ollama from './lib/ollama.js';
import { openStore } from './lib/db.js';
import { HttpError } from './lib/errors.js';
import { systemPrompt } from './lib/prompts.js';
import { parseEntry } from './lib/parse.js';
import { routeText } from './lib/route.js';
import { validateChat, validateText, validateEntry, validateMood, validateSummary } from './lib/validate.js';
import { readToken, hashToken, newToken, cookieHeader, clearCookieHeader } from './lib/session.js';
import { SECURITY_HEADERS, sendJson, readJson, createLimiter, clientIp, loadStatic, serveStatic } from './lib/http.js';

const MAX_ENTRIES_PER_WORKER = 2000;
const AI_DOWN = 'The AI could not be reached right now. Please try again in a moment.';
const TEXT_HEADERS = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' };

/**
 * Build the HTTP server. Dependencies are injectable so tests can mock the model and use an in-memory database.
 * @param {{llm?: typeof ollama, store?: ReturnType<typeof openStore>, aiLimiter?: object, dataLimiter?: object, publicDir?: string}} [deps]
 */
export function createApp({ llm = ollama, store, aiLimiter, dataLimiter, publicDir = path.join(ROOT, 'public') } = {}) {
  const cfg = getConfig();
  const db = store ?? openStore(cfg.dbPath);
  const aiLimit = aiLimiter ?? createLimiter({ max: cfg.rateLimit });
  const dataLimit = dataLimiter ?? createLimiter({ max: cfg.rateLimit * 4 });
  const statics = loadStatic(publicDir);
  const isHttps = req => req.headers['x-forwarded-proto'] === 'https';

  // ---- sessions: workers are created lazily on first write, never for read-only visitors
  const findWorker = req => {
    const token = readToken(req);
    return token ? db.findWorkerByHash(hashToken(token)) : null;
  };
  function ensureWorker(req, res) {
    const existing = findWorker(req);
    if (existing) return existing;
    const token = newToken();
    const worker = db.createWorker(hashToken(token));
    res.setHeader('Set-Cookie', cookieHeader(token, isHttps(req)));
    return worker;
  }

  // ---- AI handlers
  /** Stream the model's reply as plain text. If the model fails we say so; we never invent an answer. */
  async function chat({ body, res }) {
    const { module, lang, messages, context } = validateChat(body);
    const prompt = [{ role: 'system', content: systemPrompt(module, lang, context) }, ...messages];
    const abort = new AbortController();
    res.on('close', () => abort.abort());

    let iterator;
    let first;
    try {
      iterator = llm.chatStream(prompt, { signal: abort.signal })[Symbol.asyncIterator]();
      first = await iterator.next();
    } catch (e) {
      console.warn('chat failed:', e.message);
      throw new HttpError(503, AI_DOWN);
    }
    if (first.done) throw new HttpError(503, AI_DOWN);

    res.writeHead(200, TEXT_HEADERS);
    res.write(first.value);
    try {
      for (;;) {
        const next = await iterator.next();
        if (next.done) break;
        res.write(next.value);
      }
    } catch (e) {
      console.warn('stream ended early:', e.message);
    }
    res.end();
  }

  const aiRoutes = {
    '/api/chat': chat,
    '/api/parse': async ({ body, res }) => sendJson(res, 200, await parseEntry(validateText(body), llm)),
    '/api/route': async ({ body, res }) => sendJson(res, 200, await routeText(validateText(body, 500), llm)),
  };

  // ---- data handlers
  const dataRoutes = [
    [/^\/api\/state$/, {
      GET({ req, res }) {
        const worker = findWorker(req);
        sendJson(res, 200, worker
          ? { entries: db.listEntries(worker.id), moods: db.listMoods(worker.id), docSummary: worker.doc_summary }
          : { entries: [], moods: [], docSummary: '' });
      },
    }],
    [/^\/api\/entries$/, {
      POST({ req, res, body }) {
        const entry = validateEntry(body);
        const worker = ensureWorker(req, res);
        if (db.countEntries(worker.id) >= MAX_ENTRIES_PER_WORKER) throw new HttpError(409, 'You have reached the limit of saved days. Please delete old entries.');
        sendJson(res, 201, db.addEntry(worker.id, entry));
      },
    }],
    [/^\/api\/entries\/(\d{1,12})$/, {
      DELETE({ req, res, params }) {
        const worker = findWorker(req);
        if (!worker || !db.deleteEntry(worker.id, Number(params[0]))) throw new HttpError(404, 'Entry not found');
        sendJson(res, 200, { ok: true });
      },
    }],
    [/^\/api\/moods$/, {
      POST({ req, res, body }) {
        const { date, score } = validateMood(body);
        db.addMood(ensureWorker(req, res).id, date, score);
        sendJson(res, 201, { ok: true });
      },
    }],
    [/^\/api\/doc-summary$/, {
      PUT({ req, res, body }) {
        db.setDocSummary(ensureWorker(req, res).id, validateSummary(body));
        sendJson(res, 200, { ok: true });
      },
    }],
    [/^\/api\/export$/, {
      GET({ req, res }) {
        const worker = findWorker(req);
        const data = worker ? db.exportAll(worker.id) : { exportedAt: new Date().toISOString(), entries: [], moods: [], documentSummary: '' };
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="gigsaathi-data.json"',
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify(data, null, 2));
      },
    }],
    [/^\/api\/me$/, {
      DELETE({ req, res }) {
        const worker = findWorker(req);
        if (worker) db.deleteWorker(worker.id);
        res.setHeader('Set-Cookie', clearCookieHeader());
        sendJson(res, 200, { ok: true });
      },
    }],
  ];

  async function handleApi(req, res, pathname) {
    const conf = getConfig();
    const ip = clientIp(req, conf.trustProxy);
    const tooMany = limiter => {
      if (!limiter.hit(ip)) return;
      res.setHeader('Retry-After', '60');
      throw new HttpError(429, 'Too many requests. Please wait a minute.');
    };

    if (pathname === '/api/health') {
      if (req.method !== 'GET') throw new HttpError(405, 'Use GET');
      return sendJson(res, 200, { ok: true, db: db.ping(), keyLoaded: Boolean(conf.key) });
    }
    if (pathname === '/api/health/model') {
      if (req.method !== 'GET') throw new HttpError(405, 'Use GET');
      tooMany(aiLimit);
      return sendJson(res, 200, await llm.checkModel());
    }
    if (Object.hasOwn(aiRoutes, pathname)) {
      if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
      tooMany(aiLimit);
      return aiRoutes[pathname]({ req, res, body: await readJson(req) });
    }
    const hit = dataRoutes.map(([re, methods]) => [re.exec(pathname), methods]).find(([m]) => m);
    if (!hit) throw new HttpError(404, 'Not found');
    const [match, methods] = hit;
    const handler = Object.hasOwn(methods, req.method) ? methods[req.method] : null;
    if (!handler) throw new HttpError(405, 'Method not allowed');
    tooMany(dataLimit);
    const body = req.method === 'POST' || req.method === 'PUT' ? await readJson(req) : null;
    return handler({ req, res, body, params: match.slice(1) });
  }

  const server = http.createServer(async (req, res) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
      const entry = statics.get(pathname);
      if (!entry) throw new HttpError(404, 'Not found');
      return serveStatic(entry, req, res);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      if (res.headersSent) return res.end();
      sendJson(res, status, { error: e instanceof HttpError ? e.message : 'Something went wrong' });
    }
  });
  if (!store) server.on('close', () => db.close());
  return server;
}

export function start() {
  const cfg = getConfig();
  const server = createApp();
  server.listen(cfg.port, () => {
    console.log(`GigSaathi on http://localhost:${cfg.port}  model=${cfg.model}  db=${cfg.dbPath}`);
    // Prove the AI path works end to end, so problems show up at launch rather than in front of a user.
    ollama.checkModel().then(r => {
      if (r.ok) console.log(`AI check OK: ${r.model} answered a real request.`);
      else console.error(`AI check FAILED for model "${r.model}": ${r.error}${r.available?.length ? `\n  similar models on your account: ${r.available.join(', ')}` : ''}`);
    });
  });
  const stop = () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
