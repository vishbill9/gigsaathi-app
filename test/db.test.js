import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openStore } from '../lib/db.js';

const entry = (o = {}) => ({ date: '2026-10-16', platform: 'Zomato', orders: 12, income: 1500, fuel: 200, other: 0, hours: 8, ...o });

test('entries are stored per worker and ordered by date', () => {
  const db = openStore();
  const a = db.createWorker('hash-a');
  const b = db.createWorker('hash-b');
  db.addEntry(a.id, entry({ date: '2026-10-16' }));
  db.addEntry(a.id, entry({ date: '2026-10-14', income: 900 }));
  db.addEntry(b.id, entry({ income: 5 }));
  assert.deepEqual(db.listEntries(a.id).map(e => e.date), ['2026-10-14', '2026-10-16']);
  assert.equal(db.listEntries(b.id).length, 1);
  assert.equal(db.countEntries(a.id), 2);
});

test('a worker cannot delete another worker\'s entry', () => {
  const db = openStore();
  const a = db.createWorker('hash-a');
  const b = db.createWorker('hash-b');
  const saved = db.addEntry(a.id, entry());
  assert.equal(db.deleteEntry(b.id, saved.id), false);
  assert.equal(db.deleteEntry(a.id, saved.id), true);
  assert.equal(db.listEntries(a.id).length, 0);
});

test('workers are found by token hash only', () => {
  const db = openStore();
  const w = db.createWorker('abc');
  assert.equal(db.findWorkerByHash('abc').id, w.id);
  assert.equal(db.findWorkerByHash('nope'), null);
});

test('moods keep only the latest 60', () => {
  const db = openStore();
  const w = db.createWorker('h');
  for (let i = 0; i < 65; i++) db.addMood(w.id, '2026-10-16', (i % 5) + 1);
  assert.equal(db.listMoods(w.id).length, 60);
});

test('deleting a worker removes all of their data', () => {
  const db = openStore();
  const w = db.createWorker('h');
  db.addEntry(w.id, entry());
  db.addMood(w.id, '2026-10-16', 3);
  db.setDocSummary(w.id, 'notice');
  db.deleteWorker(w.id);
  assert.equal(db.findWorkerByHash('h'), null);
  assert.equal(db.listEntries(w.id).length, 0);
  assert.equal(db.listMoods(w.id).length, 0);
});

test('data survives closing and reopening a database file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gigsaathi-'));
  const file = path.join(dir, 'nested', 'test.db');
  try {
    const first = openStore(file);
    const w = first.createWorker('persist');
    first.addEntry(w.id, entry({ income: 777 }));
    first.setDocSummary(w.id, 'kept');
    first.close();

    const second = openStore(file);
    const found = second.findWorkerByHash('persist');
    assert.equal(found.doc_summary, 'kept');
    assert.equal(second.listEntries(found.id)[0].income, 777);
    assert.equal(second.ping(), true);
    second.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
