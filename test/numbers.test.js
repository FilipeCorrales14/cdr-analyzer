import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/numbers.js';

const cases = [
  ['2001', 'interna'],
  ['190', 'emergencia'],
  ['0800 123 4567', 'gratuita'],
  ['33334444', 'local_fixo'],
  ['999998888', 'local_movel'],
  ['(51) 3333-4444', 'local_fixo'], // DDD + número, como no identificador de chamadas
  ['11 99999-8888', 'ddd_movel'],
  ['1234567', 'desconhecido'],
  ['0 21 11 33334444', 'ddd_fixo'],
  ['0 21 11 999998888', 'ddd_movel'],
  ['0 15 51 999998888', 'local_movel'], // mesmo DDD discado com CSP
  ['00 1 2125550100', 'internacional'],
  ['', 'desconhecido'],
];

for (const [input, expected] of cases) {
  test(`"${input}" é ${expected}`, () => {
    assert.equal(classify(input, '51').type, expected);
  });
}

test('normaliza mantendo DDD e assinante nas chamadas de longa distância', () => {
  const r = classify('0-21-11-99999-8888', '51');
  assert.equal(r.normalized, '11999998888');
  assert.equal(r.ddd, '11');
});
