import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billedSeconds, costOf } from '../src/billing.js';

test('regra 3s / 30s / 6s', () => {
  assert.equal(billedSeconds(0), 0);
  assert.equal(billedSeconds(3), 0);
  assert.equal(billedSeconds(4), 30);
  assert.equal(billedSeconds(30), 30);
  assert.equal(billedSeconds(31), 36);
  assert.equal(billedSeconds(36), 36);
  assert.equal(billedSeconds(37), 42);
  assert.equal(billedSeconds(125), 126);
});

test('custo em centavos com base na tarifa do tipo', () => {
  const rates = { local_movel: 0.45 };
  // 60s exatos = 1 minuto
  assert.equal(costOf({ type: 'local_movel', durationS: 60, direction: 'saida' }, rates), 45);
  // 61s -> 66s cobrados -> 1,1 min * 0,45 = 0,495 -> 50 centavos
  assert.equal(costOf({ type: 'local_movel', durationS: 61, direction: 'saida' }, rates), 50);
});

test('chamadas recebidas e tipos sem tarifa custam zero', () => {
  assert.equal(costOf({ type: 'local_movel', durationS: 300, direction: 'entrada' }, { local_movel: 1 }), 0);
  assert.equal(costOf({ type: 'gratuita', durationS: 300, direction: 'saida' }, {}), 0);
});
