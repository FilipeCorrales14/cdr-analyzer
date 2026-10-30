// Parser de CSV suficiente para exports de PABX: aceita vírgula ou
// ponto e vírgula, campos entre aspas e aspas escapadas ("").
// Não trata quebra de linha dentro de campo, que nunca aparece nesses
// arquivos e complicaria a leitura linha a linha.

export function detectDelimiter(headerLine) {
  const semicolons = headerLine.split(';').length;
  const commas = headerLine.split(',').length;
  return semicolons > commas ? ';' : ',';
}

export function parseLine(line, delimiter) {
  const fields = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function* parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const delimiter = detectDelimiter(lines[0] ?? '');
  const header = parseLine(lines[0] ?? '', delimiter).map((h) => h.toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i], delimiter);
    const row = Object.fromEntries(header.map((h, idx) => [h, values[idx] ?? '']));
    yield { lineNumber: i + 1, row };
  }
}
