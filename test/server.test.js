import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import { openStore } from '../lib/db.js';
import { createLimiter } from '../lib/http.js';

const okLlm = () => ({
  chat: async () => '{"orders":3,"income":500,"fuel":50,"other":0,"hours":2,"platform":"Zomato"}',
  async *chatStream() { yield 'Hel'; yield 'lo'; },
  checkModel: async () => ({ ok: true, model: 'mock' }),
});
const downLlm = () => ({
  chat: async () => { throw new Error('down'); },
  chatStream() { throw new Error('down'); },
  checkModel: async () => ({ ok: false, model: 'mock', error: 'down' }),
});

async function boot(llm = okLlm(), extra = {}) {
  const store = openStore(':memory:');
  const server = createApp({ llm, store, ...extra });
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, close: () => new Promise(resolve => server.close(resolve)) };
}

const today = () => new Date().toISOString().slice(0, 10);
const jsonReq = (method, body, cookie) => ({
  method,
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const cookieOf = res => res.headers.get('set-cookie')?.split(';')[0];
const entry = (o = {}) => ({ date: today(), platform: 'Zomato', orders: 12, income: 1500, fuel: 200, other: 0, hours: 8, ...o });

test('health reports a working database', async () => {
  const { base, close } = await boot();
  const body = await (await fetch(`${base}/api/health`)).json();
  assert.equal(body.ok, true);
  assert.equal(body.db, true);
  await close();
});

test('pages and scripts are served with strict security headers', async () => {
  const { base, close } = await boot();
  const res = await fetch(base);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(`${base}/js/app.js`)).status, 200);
  assert.equal((await fetch(`${base}/css/styles.css`)).status, 200);
  assert.equal((await fetch(`${base}/server.js`)).status, 404);
  assert.equal((await fetch(`${base}/..%2fserver.js`)).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  const etag = res.headers.get('etag');
  assert.equal((await fetch(base, { headers: { 'If-None-Match': etag } })).status, 304);
  await close();
});

test('chat streams the real model output', async () => {
  const { base, close } = await boot();
  const res = await fetch(`${base}/api/chat`, jsonReq('POST', { module: 'buddy', lang: 'en', messages: [{ role: 'user', content: 'hi' }] }));
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'Hello');
  await close();
});

test('when the AI is down the API says so and never invents an answer', async () => {
  const { base, close } = await boot(downLlm());
  const res = await fetch(`${base}/api/chat`, jsonReq('POST', { module: 'buddy', messages: [{ role: 'user', content: 'hi' }] }));
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /could not be reached/);
  await close();
});

test('chat rejects bad input', async () => {
  const { base, close } = await boot();
  assert.equal((await fetch(`${base}/api/chat`, jsonReq('POST', { module: 'nope', messages: [] }))).status, 400);
  assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' })).status, 415);
  assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' })).status, 400);
  assert.equal((await fetch(`${base}/api/chat`, jsonReq('POST', { module: 'buddy', messages: [{ role: 'user', content: 'x'.repeat(200_000) }] }))).status, 413);
  assert.equal((await fetch(`${base}/api/chat`)).status, 405);
  await close();
});

test('parse and route endpoints return structured results', async () => {
  const { base, close } = await boot();
  const parsed = await (await fetch(`${base}/api/parse`, jsonReq('POST', { text: '3 orders 500 rs' }))).json();
  assert.equal(parsed.income, 500);
  const routed = await (await fetch(`${base}/api/route`, jsonReq('POST', { text: 'hello' }))).json();
  assert.ok(routed.module);
  const model = await (await fetch(`${base}/api/health/model`)).json();
  assert.equal(model.ok, true);
  await close();
});

test('read-only visitors get an empty state and no cookie', async () => {
  const { base, close } = await boot();
  const res = await fetch(`${base}/api/state`);
  assert.deepEqual(await res.json(), { entries: [], moods: [], docSummary: '' });
  assert.equal(res.headers.get('set-cookie'), null);
  await close();
});

test('entries are saved to the database and isolated per worker', async () => {
  const { base, close } = await boot();
  const created = await fetch(`${base}/api/entries`, jsonReq('POST', entry()));
  assert.equal(created.status, 201);
  const cookie = cookieOf(created);
  assert.match(created.headers.get('set-cookie'), /HttpOnly/);
  assert.match(created.headers.get('set-cookie'), /SameSite=Strict/);
  const saved = await created.json();

  const mine = await (await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).json();
  assert.equal(mine.entries.length, 1);
  assert.equal(mine.entries[0].income, 1500);

  const stranger = await (await fetch(`${base}/api/state`)).json();
  assert.equal(stranger.entries.length, 0);

  const other = cookieOf(await fetch(`${base}/api/entries`, jsonReq('POST', entry({ income: 9 }))));
  assert.notEqual(other, cookie);
  assert.equal((await fetch(`${base}/api/entries/${saved.id}`, jsonReq('DELETE', undefined, other))).status, 404);
  assert.equal((await fetch(`${base}/api/entries/${saved.id}`, jsonReq('DELETE', undefined, cookie))).status, 200);
  assert.equal((await (await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).json()).entries.length, 0);
  await close();
});

test('invalid entries are rejected before they reach the database', async () => {
  const { base, close } = await boot();
  for (const bad of [entry({ date: '1999-01-01' }), entry({ income: -5 }), entry({ orders: 0, income: 0 }), entry({ hours: 99 }), { date: today() }]) {
    const res = await fetch(`${base}/api/entries`, jsonReq('POST', bad));
    assert.equal(res.status, 400);
    assert.equal(res.headers.get('set-cookie'), null);
  }
  await close();
});

test('moods and the document summary persist', async () => {
  const { base, close } = await boot();
  const first = await fetch(`${base}/api/moods`, jsonReq('POST', { date: today(), score: 2 }));
  assert.equal(first.status, 201);
  const cookie = cookieOf(first);
  assert.equal((await fetch(`${base}/api/moods`, jsonReq('POST', { date: today(), score: 8 }, cookie))).status, 400);
  assert.equal((await fetch(`${base}/api/doc-summary`, jsonReq('PUT', { text: 'Notice: pay was cut' }, cookie))).status, 200);
  const state = await (await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).json();
  assert.deepEqual(state.moods, [{ d: today(), s: 2 }]);
  assert.equal(state.docSummary, 'Notice: pay was cut');
  await close();
});

test('workers can export and permanently delete their data', async () => {
  const { base, close } = await boot();
  const cookie = cookieOf(await fetch(`${base}/api/entries`, jsonReq('POST', entry())));
  const exported = await fetch(`${base}/api/export`, { headers: { Cookie: cookie } });
  assert.match(exported.headers.get('content-disposition'), /attachment/);
  assert.equal((await exported.json()).entries.length, 1);

  const deleted = await fetch(`${base}/api/me`, jsonReq('DELETE', undefined, cookie));
  assert.equal(deleted.status, 200);
  assert.match(deleted.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await (await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })).json()).entries.length, 0);
  await close();
});

test('API is rate limited', async () => {
  const { base, close } = await boot(okLlm(), { dataLimiter: createLimiter({ max: 2 }) });
  assert.equal((await fetch(`${base}/api/state`)).status, 200);
  assert.equal((await fetch(`${base}/api/state`)).status, 200);
  const third = await fetch(`${base}/api/state`);
  assert.equal(third.status, 429);
  assert.equal(third.headers.get('retry-after'), '60');
  await close();
});
