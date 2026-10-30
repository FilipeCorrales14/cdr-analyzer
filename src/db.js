import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS calls (
  id          INTEGER PRIMARY KEY,
  start       TEXT    NOT NULL,
  extension   TEXT    NOT NULL,
  number      TEXT    NOT NULL,
  type        TEXT    NOT NULL,
  direction   TEXT    NOT NULL,
  duration_s  INTEGER NOT NULL,
  billed_s    INTEGER NOT NULL,
  cost_cents  INTEGER NOT NULL,
  trunk       TEXT,
  UNIQUE (start, extension, number, duration_s)
);
CREATE INDEX IF NOT EXISTS idx_calls_start ON calls (start);
CREATE INDEX IF NOT EXISTS idx_calls_extension ON calls (extension);
`;

export function openDb(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}
