// Classificação de números discados no padrão brasileiro.
//
// Formatos tratados:
//   3 a 5 dígitos ............ ramal interno
//   190, 192, 193 ............ emergência
//   0800 / 0300 / 0303 ....... não geográfico
//   00 + ... ................. internacional
//   0 + CSP(2) + DDD + número  longa distância (ou local, se o DDD for o mesmo)
//   DDD + número ............. como chega no identificador de chamadas
//   8 dígitos ................ fixo local
//   9 dígitos começando com 9  móvel local

const EMERGENCY = new Set(['190', '192', '193', '199', '153']);

export const CALL_TYPES = [
  'interna',
  'emergencia',
  'gratuita',
  'local_fixo',
  'local_movel',
  'ddd_fixo',
  'ddd_movel',
  'internacional',
  'desconhecido',
];

export function normalize(number) {
  return String(number ?? '').replace(/\D/g, '');
}

export function classify(rawNumber, localDdd) {
  const n = normalize(rawNumber);

  if (EMERGENCY.has(n)) return { type: 'emergencia', normalized: n };
  if (n.length >= 3 && n.length <= 5) return { type: 'interna', normalized: n };
  if (/^0(800|300|303)/.test(n)) return { type: 'gratuita', normalized: n };
  if (n.startsWith('00')) return { type: 'internacional', normalized: n };

  if (n.startsWith('0')) {
    // 0 + CSP + DDD + assinante. O assinante tem 8 (fixo) ou 9 (móvel) dígitos.
    const match = /^0(\d{2})(\d{2})(\d{8,9})$/.exec(n);
    if (!match) return { type: 'desconhecido', normalized: n };
    const [, , ddd, subscriber] = match;
    const scope = ddd === String(localDdd) ? 'local' : 'ddd';
    return { type: `${scope}_${kindOf(subscriber)}`, normalized: `${ddd}${subscriber}`, ddd };
  }

  // DDD + assinante sem prefixo: formato do identificador de chamadas.
  const withDdd = /^([1-9]{2})(\d{8,9})$/.exec(n);
  if (withDdd) {
    const [, ddd, subscriber] = withDdd;
    const scope = ddd === String(localDdd) ? 'local' : 'ddd';
    return { type: `${scope}_${kindOf(subscriber)}`, normalized: n, ddd };
  }

  if (n.length === 8 || n.length === 9) {
    return { type: `local_${kindOf(n)}`, normalized: n };
  }

  return { type: 'desconhecido', normalized: n };
}

// Desde a inclusão do nono dígito, todo celular tem 9 dígitos e todo fixo tem 8.
function kindOf(subscriber) {
  return subscriber.length === 9 ? 'movel' : 'fixo';
}
