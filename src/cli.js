#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { importCsv } from './importer.js';
import * as reports from './reports.js';
import { money, duration, table, csv, bar } from './format.js';

const DEFAULT_RATES = fileURLToPath(new URL('../config/tarifas.json', import.meta.url));

const HELP = `Uso:
  cdr importar <arquivo.csv> [--ddd 51] [--tarifas config/tarifas.json]
  cdr relatorio <resumo|ramais|horarios|longas> [--de AAAA-MM-DD] [--ate AAAA-MM-DD] [--formato tabela|csv|json]

Opções gerais:
  --db <arquivo>   banco SQLite (padrão: cdr.db)
`;

export function run(argv, { out = console.log, err = console.error } = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      db: { type: 'string', default: 'cdr.db' },
      ddd: { type: 'string', default: '51' },
      tarifas: { type: 'string', default: DEFAULT_RATES },
      de: { type: 'string' },
      ate: { type: 'string' },
      formato: { type: 'string', default: 'tabela' },
      limite: { type: 'string', default: '10' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  const [command, arg] = positionals;
  if (values.help || !command) {
    out(HELP);
    return 0;
  }

  for (const date of [values.de, values.ate]) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      err(`data inválida: ${date} (use AAAA-MM-DD)`);
      return 1;
    }
  }

  const db = openDb(values.db);

  if (command === 'importar') {
    if (!arg) {
      err('informe o arquivo CSV');
      return 1;
    }
    const rates = JSON.parse(readFileSync(values.tarifas, 'utf8'));
    const result = importCsv(db, readFileSync(arg, 'utf8'), { localDdd: values.ddd, rates });
    out(`Linhas lidas: ${result.read}`);
    out(`Importadas:   ${result.inserted}`);
    out(`Já existiam:  ${result.duplicated}`);
    if (result.errors.length) {
      out(`Com erro:     ${result.errors.length}`);
      for (const e of result.errors.slice(0, 20)) out(`  linha ${e.line}: ${e.message}`);
      if (result.errors.length > 20) out(`  ... e mais ${result.errors.length - 20}`);
    }
    return 0;
  }

  if (command === 'relatorio') {
    const filter = { from: values.de, to: values.ate };
    const report = REPORTS[arg];
    if (!report) {
      err(`relatório desconhecido: ${arg ?? '(vazio)'}. Opções: ${Object.keys(REPORTS).join(', ')}`);
      return 1;
    }
    out(report(db, filter, values));
    return 0;
  }

  err(`comando desconhecido: ${command}\n\n${HELP}`);
  return 1;
}

const COLS = {
  calls: { label: 'Chamadas', value: (r) => r.calls, align: 'right' },
  duration: { label: 'Duração', value: (r) => duration(r.duration_s), raw: (r) => r.duration_s, align: 'right' },
  cost: { label: 'Custo', value: (r) => money(r.cost_cents), raw: (r) => (r.cost_cents / 100).toFixed(2), align: 'right' },
};

function render(columns, rows, format) {
  if (format === 'json') return JSON.stringify(rows, null, 2);
  if (format === 'csv') return csv(columns, rows);
  return table(columns, rows);
}

const REPORTS = {
  resumo(db, filter, { formato }) {
    const { totals, byType } = reports.summary(db, filter);
    if (formato === 'json') return JSON.stringify({ totals, byType }, null, 2);
    const body = render([{ label: 'Tipo', value: (r) => r.type }, COLS.calls, COLS.duration, COLS.cost], byType, formato);
    if (formato === 'csv') return body;
    return `${body}\n\nTotal: ${totals.calls} chamadas, ${duration(totals.duration_s)}, ${money(totals.cost_cents)}`;
  },

  ramais(db, filter, { formato }) {
    const rows = reports.byExtension(db, filter);
    return render(
      [
        { label: 'Ramal', value: (r) => r.extension },
        COLS.calls,
        { label: 'Saída', value: (r) => r.outgoing, align: 'right' },
        COLS.duration,
        COLS.cost,
      ],
      rows,
      formato,
    );
  },

  horarios(db, filter, { formato }) {
    const rows = reports.byHour(db, filter);
    if (formato !== 'tabela') {
      return render([{ label: 'Hora', value: (r) => r.hour }, COLS.calls], rows, formato);
    }
    const max = Math.max(...rows.map((r) => r.calls));
    const peak = rows.find((r) => r.calls === max);
    const lines = rows.map((r) => `${String(r.hour).padStart(2, '0')}h ${String(r.calls).padStart(5)} ${bar(r.calls, max)}`);
    return `${lines.join('\n')}\n\nHorário de pico: ${String(peak.hour).padStart(2, '0')}h (${max} chamadas)`;
  },

  longas(db, filter, { formato, limite }) {
    const rows = reports.longest(db, filter, Number(limite));
    return render(
      [
        { label: 'Início', value: (r) => r.start },
        { label: 'Ramal', value: (r) => r.extension },
        { label: 'Número', value: (r) => r.number },
        { label: 'Tipo', value: (r) => r.type },
        COLS.duration,
        COLS.cost,
      ],
      rows,
      formato,
    );
  },
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = run(process.argv.slice(2));
}
