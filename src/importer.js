import { parseCsv } from './csv.js';
import { toRecord } from './record.js';
import { billedSeconds, costOf } from './billing.js';

export function importCsv(db, text, { localDdd, rates }) {
  // INSERT OR IGNORE + UNIQUE: reimportar o mesmo arquivo não duplica chamadas.
  const insert = db.prepare(`
    INSERT OR IGNORE INTO calls
      (start, extension, number, type, direction, duration_s, billed_s, cost_cents, trunk)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const summary = { read: 0, inserted: 0, duplicated: 0, errors: [] };

  db.exec('BEGIN');
  try {
    for (const { lineNumber, row } of parseCsv(text)) {
      summary.read++;
      let record;
      try {
        record = toRecord(row, { localDdd });
      } catch (err) {
        summary.errors.push({ line: lineNumber, message: err.message });
        continue;
      }
      const billed = record.direction === 'saida' ? billedSeconds(record.durationS) : 0;
      const cost = costOf(record, rates);
      const { changes } = insert.run(
        record.start, record.extension, record.number, record.type, record.direction,
        record.durationS, billed, cost, record.trunk,
      );
      if (changes > 0) summary.inserted++;
      else summary.duplicated++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return summary;
}
