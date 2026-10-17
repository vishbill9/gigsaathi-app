import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../server.js';
import { openStore } from '../lib/db.js';

const okLlm = { chat: async () => '', async *chatStream() { yield 'x'; }, checkModel: async () => ({ ok: true }) };
const listen = server => new Promise(r => server.listen(0, () => r(`http://127.0.0.1:${server.address().port}`)));
const idToken = claims => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
const jar = res => (res.headers.getSetCookie?.() ?? []).map(c => c.split(';')[0]).filter(c => !c.endsWith('=')).join('; ');

/** A tiny fake Google: the token endpoint returns whatever `next` holds. */
async function boot(profile) {
  let issued = null;
  const google = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const form = new URLSearchParams(body);
      const ok = form.get('code') === 'good-code' && form.get('code_verifier') && form.get('client_secret') === 'sec';
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ok ? { id_token: idToken({ iss: gbase, aud: 'cid', exp: Date.now() / 1000 + 600, nonce: issued.nonce, email_verified: true, ...issued.profile }) } : { error: 'bad' }));
    });
  });
  const gbase = await listen(google);
  Object.assign(process.env, { GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'sec', GOOGLE_AUTH_URL: `${gbase}/auth`, GOOGLE_TOKEN_URL: `${gbase}/token` });
  const store = openStore(':memory:');
  const app = createApp({ llm: okLlm, store });
  const base = await listen(app);
  const login = async (cookie = '') => {
    const start = await fetch(`${base}/auth/google`, { redirect: 'manual', headers: cookie ? { Cookie: cookie } : {} });
    const target = new URL(start.headers.get('location'));
    issued = { nonce: target.searchParams.get('nonce'), profile };
    const flow = jar(start);
    const done = await fetch(`${base}/auth/google/callback?code=good-code&state=${target.searchParams.get('state')}`, {
      redirect: 'manual', headers: { Cookie: [cookie, flow].filter(Boolean).join('; ') },
    });
    return { start, target, done };
  };
  const close = () => { app.closeAllConnections(); google.closeAllConnections(); return Promise.all([new Promise(r => app.close(r)), new Promise(r => google.close(r))]); };
  return { base, store, login, close };
}
const P = { sub: 'sub-1', email: 'worker@example.com', name: 'Ravi Kumar' };
const state = (base, cookie) => fetch(`${base}/api/state`, { headers: cookie ? { Cookie: cookie } : {} }).then(r => r.json());

test('without Google credentials sign-in is off and guests still work', async () => {
  for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) delete process.env[k];
  const app = createApp({ llm: okLlm, store: openStore(':memory:') });
  const base = await listen(app);
  assert.equal((await fetch(`${base}/auth/google`, { redirect: 'manual' })).status, 404);
  assert.equal((await state(base)).auth.enabled, false);
  app.closeAllConnections(); await new Promise(r => app.close(r));
});

test('login redirects to Google with PKCE, state and nonce', async () => {
  const { login, close } = await boot(P);
  const { start, target } = await login();
  assert.equal(start.status, 302);
  assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(target.searchParams.get('state') && target.searchParams.get('nonce'));
  assert.equal(target.searchParams.get('client_id'), 'cid');
  assert.match(start.headers.get('set-cookie'), /gs_oauth=.*HttpOnly/);
  await close();
});

test('a full login signs the worker in and /api/state shows who they are', async () => {
  const { base, login, close } = await boot(P);
  const { done } = await login();
  assert.equal(done.status, 302);
  assert.equal(done.headers.get('location'), '/');
  const cookie = jar(done);
  const s = await state(base, cookie);
  assert.equal(s.auth.enabled, true);
  assert.deepEqual(s.auth.user, { name: 'Ravi Kumar', email: 'worker@example.com' });
  await close();
});

test('guest data is kept when signing in, and follows the account to another device', async () => {
  const { base, login, close } = await boot(P);
  const guest = await fetch(`${base}/api/entries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), platform: 'Zomato', orders: 5, income: 900, fuel: 100, other: 0, hours: 4 }) });
  const guestCookie = jar(guest);
  const first = await login(guestCookie);
  const phone = jar(first.done);
  assert.equal((await state(base, phone)).entries.length, 1);
  // a brand new device (no cookie) signs in to the same account and sees the same data
  const second = await login();
  const laptop = jar(second.done);
  assert.equal((await state(base, laptop)).entries.length, 1);
  // both devices stay signed in
  assert.equal((await state(base, phone)).auth.user.email, 'worker@example.com');
  await close();
});

test('logout ends only that device session', async () => {
  const { base, login, close } = await boot(P);
  const a = jar((await login()).done);
  const b = jar((await login()).done);
  await fetch(`${base}/api/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: a }, body: '{}' });
  assert.equal((await state(base, a)).auth.user, null);
  assert.ok((await state(base, b)).auth.user);
  await close();
});

test('a wrong state or missing flow cookie is rejected', async () => {
  const { base, close } = await boot(P);
  const bad = await fetch(`${base}/auth/google/callback?code=good-code&state=${'a'.repeat(43)}`, { redirect: 'manual' });
  assert.equal(bad.status, 302);
  assert.match(bad.headers.get('location'), /auth_error=/);
  assert.equal(jar(bad), '');
  await close();
});

test('a token with the wrong audience is rejected', async () => {
  const { base, login, close } = await boot({ ...P, aud: 'someone-else' });
  const { done } = await login();
  assert.match(done.headers.get('location'), /auth_error=/);
  assert.equal((await state(base, jar(done))).auth.user, null);
  await close();
});
