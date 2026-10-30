export function money(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function duration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function table(columns, rows) {
  const widths = columns.map((c) =>
    Math.max(c.label.length, ...rows.map((r) => String(c.value(r)).length)),
  );
  const line = (cells) =>
    cells.map((cell, i) => (columns[i].align === 'right' ? cell.padStart(widths[i]) : cell.padEnd(widths[i]))).join('  ');

  return [
    line(columns.map((c) => c.label)),
    widths.map((w) => '-'.repeat(w)).join('  '),
    ...rows.map((r) => line(columns.map((c) => String(c.value(r))))),
  ].join('\n');
}

export function csv(columns, rows) {
  const escape = (v) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [
    columns.map((c) => c.label).join(';'),
    ...rows.map((r) => columns.map((c) => escape(String(c.raw ? c.raw(r) : c.value(r)))).join(';')),
  ].join('\n');
}

export function bar(value, max, width = 40) {
  if (max === 0) return '';
  return '#'.repeat(Math.round((value / max) * width));
}
