// Real persistence: SQLite through Node's built-in node:sqlite (Node 22.13+), no dependencies.
// The store is a small interface (see the returned object) so it can be swapped for Postgres or Firestore.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const MAX_MOODS = 60;

// Append-only list of schema migrations; PRAGMA user_version records how many have run.
const MIGRATIONS = [
  `CREATE TABLE workers (
     id TEXT PRIMARY KEY,
     token_hash TEXT NOT NULL UNIQUE,
     doc_summary TEXT NOT NULL DEFAULT '',
     created_at INTEGER NOT NULL
   );
   CREATE TABLE entries (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
     date TEXT NOT NULL,
     platform TEXT NOT NULL DEFAULT '',
     orders INTEGER NOT NULL,
     income INTEGER NOT NULL,
     fuel INTEGER NOT NULL,
     other INTEGER NOT NULL,
     hours REAL NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX entries_worker_date ON entries (worker_id, date);
   CREATE TABLE moods (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
     date TEXT NOT NULL,
     score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
     created_at INTEGER NOT NULL
   );
   CREATE INDEX moods_worker ON moods (worker_id, id);`,
  // v2: optional Google sign-in. A worker may have several sessions (devices) and one linked Google account.
  `CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL
   );
   INSERT INTO sessions (token_hash, worker_id, created_at) SELECT token_hash, id, created_at FROM workers;
   ALTER TABLE workers ADD COLUMN google_sub TEXT;
   ALTER TABLE workers ADD COLUMN email TEXT;
   ALTER TABLE workers ADD COLUMN name TEXT;
   CREATE UNIQUE INDEX workers_google_sub ON workers (google_sub) WHERE google_sub IS NOT NULL;`,
];

function migrate(db) {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

const entryRow = r => ({ id: Number(r.id), date: r.date, platform: r.platform, orders: r.orders, income: r.income, fuel: r.fuel, other: r.other, hours: r.hours });

/** Open (and migrate) the database at `file`; ':memory:' gives a throwaway database for tests. */
export function openStore(file = ':memory:') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);

  const sql = {
    insertWorker: db.prepare('INSERT INTO workers (id, token_hash, created_at) VALUES (?, ?, ?)'),
    workerByHash: db.prepare('SELECT w.id, w.doc_summary, w.email, w.name FROM sessions s JOIN workers w ON w.id = s.worker_id WHERE s.token_hash = ?'),
    insertSession: db.prepare('INSERT OR REPLACE INTO sessions (token_hash, worker_id, created_at) VALUES (?, ?, ?)'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    workerBySub: db.prepare('SELECT id, doc_summary, email, name FROM workers WHERE google_sub = ?'),
    setProfile: db.prepare('UPDATE workers SET google_sub = ?, email = ?, name = ? WHERE id = ?'),
    moveEntries: db.prepare('UPDATE entries SET worker_id = ? WHERE worker_id = ?'),
    moveMoods: db.prepare('UPDATE moods SET worker_id = ? WHERE worker_id = ?'),
    setSummary: db.prepare('UPDATE workers SET doc_summary = ? WHERE id = ?'),
    deleteWorker: db.prepare('DELETE FROM workers WHERE id = ?'),
    insertEntry: db.prepare('INSERT INTO entries (worker_id, date, platform, orders, income, fuel, other, hours, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    listEntries: db.prepare('SELECT id, date, platform, orders, income, fuel, other, hours FROM entries WHERE worker_id = ? ORDER BY date, id'),
    countEntries: db.prepare('SELECT COUNT(*) AS n FROM entries WHERE worker_id = ?'),
    deleteEntry: db.prepare('DELETE FROM entries WHERE id = ? AND worker_id = ?'),
    insertMood: db.prepare('INSERT INTO moods (worker_id, date, score, created_at) VALUES (?, ?, ?, ?)'),
    trimMoods: db.prepare('DELETE FROM moods WHERE worker_id = ? AND id NOT IN (SELECT id FROM moods WHERE worker_id = ? ORDER BY id DESC LIMIT ?)'),
    listMoods: db.prepare('SELECT date, score FROM moods WHERE worker_id = ? ORDER BY id'),
  };

  return {
    createWorker(tokenHash) {
      const id = crypto.randomUUID();
      sql.insertWorker.run(id, tokenHash, Date.now());
      sql.insertSession.run(tokenHash, id, Date.now());
      return { id, doc_summary: '', email: null, name: null };
    },
    findWorkerByHash: hash => sql.workerByHash.get(hash) ?? null,
    /**
     * Sign in with a verified Google profile on the device whose session is `tokenHash`.
     * Existing account: that device joins it and any guest data on the device is merged in.
     * New account: the guest worker (if any) simply gets the profile attached, so nothing is lost.
     */
    signInGoogle(tokenHash, profile, guestId) {
      const found = sql.workerBySub.get(profile.sub);
      db.exec('BEGIN');
      try {
        let id;
        if (found) {
          id = found.id;
          if (guestId && guestId !== id) {
            sql.moveEntries.run(id, guestId);
            sql.moveMoods.run(id, guestId);
            sql.deleteWorker.run(guestId);
          }
          sql.setProfile.run(profile.sub, profile.email, profile.name, id);
        } else if (guestId) {
          id = guestId;
          sql.setProfile.run(profile.sub, profile.email, profile.name, id);
        } else {
          id = crypto.randomUUID();
          sql.insertWorker.run(id, tokenHash, Date.now());
          sql.setProfile.run(profile.sub, profile.email, profile.name, id);
        }
        sql.insertSession.run(tokenHash, id, Date.now());
        db.exec('COMMIT');
        return id;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    endSession: tokenHash => { sql.deleteSession.run(tokenHash); },

    listEntries: workerId => sql.listEntries.all(workerId).map(entryRow),
    countEntries: workerId => sql.countEntries.get(workerId).n,
    addEntry(workerId, e) {
      const info = sql.insertEntry.run(workerId, e.date, e.platform, e.orders, e.income, e.fuel, e.other, e.hours, Date.now());
      return { id: Number(info.lastInsertRowid), ...e };
    },
    deleteEntry: (workerId, id) => sql.deleteEntry.run(id, workerId).changes > 0,

    listMoods: workerId => sql.listMoods.all(workerId).map(r => ({ d: r.date, s: r.score })),
    addMood(workerId, date, score) {
      sql.insertMood.run(workerId, date, score, Date.now());
      sql.trimMoods.run(workerId, workerId, MAX_MOODS);
    },

    setDocSummary: (workerId, text) => { sql.setSummary.run(text, workerId); },
    exportAll(workerId) {
      const worker = db.prepare('SELECT doc_summary FROM workers WHERE id = ?').get(workerId);
      return {
        exportedAt: new Date().toISOString(),
        entries: sql.listEntries.all(workerId).map(entryRow),
        moods: sql.listMoods.all(workerId).map(r => ({ date: r.date, score: r.score })),
        documentSummary: worker?.doc_summary ?? '',
      };
    },
    deleteWorker: workerId => { sql.deleteWorker.run(workerId); },

    ping: () => db.prepare('SELECT 1 AS ok').get().ok === 1,
    close: () => db.close(),
  };
}
