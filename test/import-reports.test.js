import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { importCsv } from '../src/importer.js';
import * as reports from '../src/reports.js';

const RATES = { local_fixo: 0.1, local_movel: 0.45, ddd_fixo: 0.25 };

const CSV = `inicio;ramal;numero;duracao;sentido
01/10/2026 09:15:00;2001;33334444;00:01:00;S
01/10/2026 09:40:00;2001;999998888;00:02:00;S
01/10/2026 14:05:00;2002;0211133334444;00:05:00;S
02/10/2026 14:30:00;2002;2001;00:00:40;I
02/10/2026 14:31:00;2003;51999990000;00:03:00;E
02/10/2026 xx:31:00;2003;33334444;00:01:00;S
`;

function load() {
  const db = openDb();
  const result = importCsv(db, CSV, { localDdd: '51', rates: RATES });
  return { db, result };
}

test('importa, aponta linhas com erro e não duplica na reimportação', () => {
  const { db, result } = load();
  assert.equal(result.read, 6);
  assert.equal(result.inserted, 5);
  assert.deepEqual(result.errors, [{ line: 7, message: 'data inválida: "02/10/2026 xx:31:00"' }]);

  const again = importCsv(db, CSV, { localDdd: '51', rates: RATES });
  assert.equal(again.inserted, 0);
  assert.equal(again.duplicated, 5);
});

test('resumo soma custo só das chamadas de saída', () => {
  const { db } = load();
  const { totals, byType } = reports.summary(db);
  // 1 min fixo (10) + 2 min móvel (90) + 5 min DDD fixo (125)
  assert.equal(totals.cost_cents, 225);
  assert.equal(totals.calls, 5);
  assert.equal(byType[0].type, 'ddd_fixo');
});

test('filtro por período', () => {
  const { db } = load();
  assert.equal(reports.summary(db, { from: '2026-10-02' }).totals.calls, 2);
  assert.equal(reports.summary(db, { to: '2026-10-01' }).totals.calls, 3);
});

test('ranking por ramal ordenado por custo', () => {
  const { db } = load();
  const rows = reports.byExtension(db);
  assert.deepEqual(rows.map((r) => r.extension), ['2002', '2001', '2003']);
  assert.equal(rows[1].cost_cents, 100);
});

test('distribuição por hora traz as 24 horas', () => {
  const { db } = load();
  const hours = reports.byHour(db);
  assert.equal(hours.length, 24);
  assert.equal(hours[9].calls, 2);
  assert.equal(hours[14].calls, 3);
  assert.equal(hours[3].calls, 0);
});

test('chamadas mais longas consideram só saída', () => {
  const { db } = load();
  const rows = reports.longest(db, {}, 2);
  assert.deepEqual(rows.map((r) => r.duration_s), [300, 120]);
});
