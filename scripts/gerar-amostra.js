#!/usr/bin/env node
// Gera um CSV de CDR sintético, no formato de export de PABX, para testar
// o importador sem expor dados reais de clientes.
//
//   node scripts/gerar-amostra.js [quantidade] [semente] > amostra.csv
//
// A semente fixa torna o arquivo reproduzível.

const total = Number(process.argv[2] ?? 2000);
let seed = Number(process.argv[3] ?? 42);

// mulberry32: gerador simples e determinístico
function random() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const pick = (list) => list[Math.floor(random() * list.length)];
const digits = (n) => Array.from({ length: n }, () => Math.floor(random() * 10)).join('');
const pad = (n) => String(n).padStart(2, '0');

const extensions = ['2001', '2002', '2003', '2010', '2011', '2020', '2030', '2031', '2040', '2100'];

// Peso maior no horário comercial, com queda no almoço.
const hourWeights = [0, 0, 0, 0, 0, 0, 0, 1, 6, 10, 12, 10, 4, 5, 10, 12, 11, 8, 3, 1, 0, 0, 0, 0];
const hourPool = hourWeights.flatMap((w, h) => Array(w).fill(h));

function destination() {
  const r = random();
  if (r < 0.15) return { number: pick(extensions), direction: 'I' };
  if (r < 0.40) return { number: `3${digits(7)}`, direction: 'S' };
  if (r < 0.65) return { number: `9${digits(8)}`, direction: 'S' };
  if (r < 0.75) return { number: `0${pick(['21', '15', '41'])}${pick(['11', '21', '48', '54'])}${digits(8)}`, direction: 'S' };
  if (r < 0.82) return { number: `0${pick(['21', '15', '41'])}${pick(['11', '21', '48'])}9${digits(8)}`, direction: 'S' };
  if (r < 0.84) return { number: `0800${digits(7)}`, direction: 'S' };
  if (r < 0.845) return { number: `0055${digits(10)}`, direction: 'S' };
  return { number: `519${digits(8)}`, direction: 'E' };
}

function durationS() {
  // A maioria das chamadas é curta; algumas poucas passam de 10 minutos.
  const r = random();
  if (r < 0.08) return Math.floor(random() * 4);
  if (r < 0.85) return 10 + Math.floor(random() * 240);
  return 240 + Math.floor(random() * 1500);
}

const lines = ['inicio;ramal;numero;duracao;sentido;tronco'];
for (let i = 0; i < total; i++) {
  const day = 1 + Math.floor(random() * 30);
  const hour = pick(hourPool);
  const start = `${pad(day)}/10/2026 ${pad(hour)}:${pad(Math.floor(random() * 60))}:${pad(Math.floor(random() * 60))}`;
  const { number, direction } = destination();
  const d = durationS();
  const hms = `${pad(Math.floor(d / 3600))}:${pad(Math.floor((d % 3600) / 60))}:${pad(d % 60)}`;
  lines.push([start, pick(extensions), number, hms, direction, `E1-${1 + Math.floor(random() * 2)}`].join(';'));
}

process.stdout.write(`${lines.join('\n')}\n`);
