import { classify } from './numbers.js';

// Nomes de coluna variam entre fabricantes. Aqui ficam os aliases mais comuns.
const ALIASES = {
  start: ['inicio', 'data_hora', 'datahora', 'start', 'date'],
  extension: ['ramal', 'origem', 'extension', 'ext'],
  number: ['numero', 'destino', 'number', 'dialed'],
  duration: ['duracao', 'duration', 'tempo'],
  direction: ['sentido', 'direcao', 'direction', 'tipo'],
  trunk: ['tronco', 'trunk', 'linha'],
};

function pick(row, field) {
  for (const key of ALIASES[field]) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return undefined;
}

export function parseDuration(value) {
  const text = String(value ?? '').trim();
  if (/^\d+$/.test(text)) return Number(text);
  const parts = text.split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isInteger(p) || p < 0)) {
    throw new Error(`duração inválida: "${value}"`);
  }
  return parts.reduce((total, p) => total * 60 + p, 0);
}

export function parseStart(value) {
  const text = String(value ?? '').trim();
  // dd/mm/aaaa hh:mm[:ss], formato padrão dos PABX nacionais
  const br = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (br) {
    const [, d, m, y, hh, mm, ss = '00'] = br;
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(text);
  if (iso) {
    const [, y, m, d, hh, mm, ss = '00'] = iso;
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }
  throw new Error(`data inválida: "${value}"`);
}

export function parseDirection(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (['s', 'saida', 'saída', 'out', 'outgoing', 'o'].includes(v)) return 'saida';
  if (['e', 'entrada', 'in', 'incoming'].includes(v)) return 'entrada';
  if (['i', 'interna', 'internal'].includes(v)) return 'interna';
  throw new Error(`sentido inválido: "${value}"`);
}

export function toRecord(row, { localDdd }) {
  const extension = pick(row, 'extension');
  const number = pick(row, 'number');
  if (!extension) throw new Error('ramal ausente');
  if (!number) throw new Error('número ausente');

  const directionRaw = pick(row, 'direction');
  const classification = classify(number, localDdd);
  // Se o export não informa o sentido, assume saída, exceto para ramais.
  const direction = directionRaw
    ? parseDirection(directionRaw)
    : classification.type === 'interna' ? 'interna' : 'saida';

  return {
    start: parseStart(pick(row, 'start')),
    extension: String(extension).trim(),
    number: classification.normalized,
    type: classification.type,
    durationS: parseDuration(pick(row, 'duration')),
    direction,
    trunk: pick(row, 'trunk') ?? null,
  };
}
