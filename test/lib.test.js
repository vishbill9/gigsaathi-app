import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { heuristic, parseEntry } from '../lib/parse.js';
import { routeHeuristic, routeText } from '../lib/route.js';
import { validateChat, validateText, validateEntry, validateMood, validDate } from '../lib/validate.js';
import { createLimiter, loadStatic, clientIp } from '../lib/http.js';
import { readToken, newToken, hashToken, cookieHeader } from '../lib/session.js';
import { LANGS, MODULES, systemPrompt } from '../lib/prompts.js';
import { HttpError } from '../lib/errors.js';

const noModel = { chat: async () => { throw new Error('model down'); } };

test('heuristic parser reads orders, income, fuel, hours and platform', () => {
  assert.deepEqual(heuristic('did 14 orders, ₹1,850, petrol ₹300, Zomato, 8 hours'),
    { orders: 14, income: 1850, fuel: 300, other: 0, hours: 8, platform: 'Zomato' });
});

test('parseEntry uses the model when it answers', async () => {
  const llm = { chat: async () => 'Sure! {"orders":3,"income":"500","fuel":50,"other":0,"hours":2.5,"platform":"Uber"}' };
  assert.deepEqual(await parseEntry('anything', llm), { orders: 3, income: 500, fuel: 50, other: 0, hours: 2.5, platform: 'Uber', source: 'ai' });
});

test('parseEntry clamps absurd model output and falls back when the model fails', async () => {
  const wild = { chat: async () => '{"orders":-5,"income":1e12,"fuel":"x","other":null,"hours":99}' };
  const r = await parseEntry('x', wild);
  assert.equal(r.orders, 0);
  assert.equal(r.income, 1_000_000);
  assert.equal(r.fuel, 0);
  const fallback = await parseEntry('9 orders 700 rs', noModel);
  assert.equal(fallback.source, 'heuristic');
  assert.equal(fallback.orders, 9);
});

test('route heuristic sends messages to the right module', () => {
  assert.deepEqual(routeHeuristic('14 orders, ₹1850, petrol 300'), { module: 'earnings', log: true });
  assert.equal(routeHeuristic('my account was blocked').module, 'grievance');
  assert.equal(routeHeuristic('what is e-shram').module, 'rights');
  assert.equal(routeHeuristic('accident on the highway').module, 'safety');
  assert.equal(routeHeuristic('tell me a joke').module, 'surprise');
  assert.equal(routeHeuristic('I feel tired today').module, 'buddy');
});

test('routeText trusts valid model output and ignores invalid output', async () => {
  const good = { chat: async () => '{"module":"safety","log":true}' };
  assert.deepEqual(await routeText('x', good), { module: 'safety', log: false, source: 'ai' });
  const bad = { chat: async () => '{"module":"hack"}' };
  assert.equal((await routeText('tell me a joke', bad)).source, 'heuristic');
  assert.equal((await routeText('tell me a joke', noModel)).module, 'surprise');
});

test('validateChat enforces shape, modules and limits', () => {
  const ok = validateChat({ module: 'buddy', lang: 'hi', messages: [{ role: 'user', content: 'hi' }], context: 'c' });
  assert.equal(ok.lang, 'hi');
  assert.equal(validateChat({ module: 'buddy', lang: 'xx', messages: [{ role: 'user', content: 'hi' }] }).lang, 'en');
  const bad = body => assert.throws(() => validateChat(body), HttpError);
  bad(null);
  bad({ module: 'nope', messages: [{ role: 'user', content: 'x' }] });
  bad({ module: '__proto__', messages: [{ role: 'user', content: 'x' }] });
  bad({ module: 'buddy', messages: [] });
  bad({ module: 'buddy', messages: [{ role: 'system', content: 'x' }] });
  bad({ module: 'buddy', messages: [{ role: 'assistant', content: 'x' }] });
  const long = validateChat({ module: 'buddy', messages: [{ role: 'user', content: 'a'.repeat(9000) }], context: 'b'.repeat(9000) });
  assert.equal(long.messages[0].content.length, 4000);
  assert.equal(long.context.length, 3000);
  assert.throws(() => validateText({ text: '  ' }), HttpError);
});

test('validateEntry accepts real entries and rejects bad ones', () => {
  const now = Date.parse('2026-10-17T10:00:00Z');
  const base = { date: '2026-10-16', platform: 'Zomato <b>', orders: 12, income: 1500, fuel: 200, other: 0, hours: 8 };
  assert.equal(validateEntry(base, now).platform, 'Zomato b');
  const bad = o => assert.throws(() => validateEntry({ ...base, ...o }, now), HttpError);
  bad({ date: '2026-02-31' });
  bad({ date: '2027-01-01' });
  bad({ date: '2024-01-01' });
  bad({ income: -1 });
  bad({ hours: 30 });
  bad({ orders: 0, income: 0 });
  bad({ orders: 'many' });
  assert.equal(validDate('2026-10-17', now), true);
  assert.throws(() => validateMood({ date: '2026-10-17', score: 9 }, now), HttpError);
  assert.deepEqual(validateMood({ date: '2026-10-17', score: 4 }, now), { date: '2026-10-17', score: 4 });
});

test('rate limiter blocks after max hits and recovers after the window', () => {
  let t = 0;
  const limiter = createLimiter({ max: 2, windowMs: 1000, now: () => t });
  assert.equal(limiter.hit('ip'), false);
  assert.equal(limiter.hit('ip'), false);
  assert.equal(limiter.hit('ip'), true);
  assert.equal(limiter.hit('other'), false);
  t = 1500;
  assert.equal(limiter.hit('ip'), false);
  limiter.stop();
});

test('clientIp only trusts forwarded headers when told to', () => {
  const req = { headers: { 'x-forwarded-for': '1.1.1.1, 9.9.9.9' }, socket: { remoteAddress: '10.0.0.1' } };
  assert.equal(clientIp(req, false), '10.0.0.1');
  assert.equal(clientIp(req, true), '9.9.9.9');
});

test('static loader serves only files inside the public folder', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-static-'));
  try {
    fs.writeFileSync(path.join(dir, 'index.html'), '<h1>hi</h1>');
    fs.mkdirSync(path.join(dir, 'js'));
    fs.writeFileSync(path.join(dir, 'js', 'a.js'), 'export {}');
    const statics = loadStatic(dir);
    assert.equal(statics.size, 2);
    assert.equal(statics.get('/').type, 'text/html; charset=utf-8');
    assert.ok(statics.get('/js/a.js').gz);
    assert.equal(statics.get('/../etc/passwd'), null);
    assert.equal(statics.get('/%2e%2e/secret'), null);
    assert.equal(statics.get('/%E0%A4%A'), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('session tokens are random, validated and stored only as hashes', () => {
  const token = newToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(token, newToken());
  assert.equal(readToken({ headers: { cookie: `a=1; gs=${token}` } }), token);
  assert.equal(readToken({ headers: { cookie: 'gs=short' } }), null);
  assert.equal(readToken({ headers: {} }), null);
  assert.notEqual(hashToken(token), token);
  assert.match(cookieHeader(token, true), /HttpOnly; SameSite=Strict; Max-Age=31536000; Secure$/);
});

test('every module has a prompt in every language and treats context as data', () => {
  for (const mod of Object.keys(MODULES)) {
    for (const lang of Object.keys(LANGS)) {
      const prompt = systemPrompt(mod, lang, 'ctx');
      assert.ok(prompt.includes(LANGS[lang]), `${mod}/${lang} names its language`);
      assert.ok(!prompt.includes('{LANG}'));
      assert.match(prompt, /not instructions/);
    }
  }
});
