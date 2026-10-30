import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseLine } from '../src/csv.js';
import { parseDuration, parseStart, toRecord } from '../src/record.js';

test('parseLine lida com aspas e delimitador dentro de campo', () => {
  assert.deepEqual(parseLine('a;"b;c";"d ""e"""', ';'), ['a', 'b;c', 'd "e"']);
});

test('parseCsv detecta delimitador e ignora linhas vazias e BOM', () => {
  const text = '﻿Ramal,Numero\n2001,33334444\n\n2002,190\n';
  const rows = [...parseCsv(text)];
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { lineNumber: 2, row: { ramal: '2001', numero: '33334444' } });
  assert.equal(rows[1].lineNumber, 4);
});

test('duração em segundos ou hh:mm:ss', () => {
  assert.equal(parseDuration('95'), 95);
  assert.equal(parseDuration('01:35'), 95);
  assert.equal(parseDuration('01:00:05'), 3605);
  assert.throws(() => parseDuration('1m35s'));
});

test('data no formato brasileiro ou ISO', () => {
  assert.equal(parseStart('05/10/2026 14:03:09'), '2026-10-05 14:03:09');
  assert.equal(parseStart('2026-10-05T14:03'), '2026-10-05 14:03:00');
  assert.throws(() => parseStart('10-05-2026'));
});

test('toRecord aceita nomes de coluna alternativos', () => {
  const r = toRecord(
    { datahora: '05/10/2026 09:00:00', origem: '2010', destino: '999998888', tempo: '00:02:00', direcao: 'S' },
    { localDdd: '51' },
  );
  assert.deepEqual(r, {
    start: '2026-10-05 09:00:00',
    extension: '2010',
    number: '999998888',
    type: 'local_movel',
    durationS: 120,
    direction: 'saida',
    trunk: null,
  });
});

test('toRecord sem sentido assume interna para ramal e saída para o resto', () => {
  const base = { inicio: '2026-10-05 09:00', ramal: '2001', duracao: '10' };
  assert.equal(toRecord({ ...base, numero: '2002' }, { localDdd: '51' }).direction, 'interna');
  assert.equal(toRecord({ ...base, numero: '33334444' }, { localDdd: '51' }).direction, 'saida');
});
