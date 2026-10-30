// Tarifação no modelo usado pelas operadoras de telefonia fixa:
//   - chamadas de até 3 segundos não são cobradas;
//   - cobra-se no mínimo 30 segundos;
//   - depois disso, em frações de 6 segundos.
// Os valores por minuto ficam em config/tarifas.json.

export const FREE_UNTIL_S = 3;
export const MINIMUM_S = 30;
export const STEP_S = 6;

export function billedSeconds(durationS) {
  if (durationS <= FREE_UNTIL_S) return 0;
  if (durationS <= MINIMUM_S) return MINIMUM_S;
  return MINIMUM_S + Math.ceil((durationS - MINIMUM_S) / STEP_S) * STEP_S;
}

export function costOf({ type, durationS, direction }, rates) {
  if (direction !== 'saida') return 0;
  const perMinute = rates[type] ?? 0;
  const seconds = billedSeconds(durationS);
  // Trabalha em centavos para não acumular erro de ponto flutuante na soma.
  return Math.round((seconds / 60) * perMinute * 100);
}
