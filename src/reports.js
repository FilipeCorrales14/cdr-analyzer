// Todas as consultas recebem um período opcional (from/to em AAAA-MM-DD).

function period({ from, to } = {}) {
  const clauses = [];
  const params = [];
  if (from) {
    clauses.push('start >= ?');
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    clauses.push('start <= ?');
    params.push(`${to} 23:59:59`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function and(where, condition) {
  return where ? `${where} AND ${condition}` : `WHERE ${condition}`;
}

export function summary(db, filter) {
  const { where, params } = period(filter);
  const totals = db.prepare(`
    SELECT COUNT(*) AS calls,
           COALESCE(SUM(duration_s), 0) AS duration_s,
           COALESCE(SUM(cost_cents), 0) AS cost_cents
      FROM calls ${where}`).get(...params);

  const byType = db.prepare(`
    SELECT type,
           COUNT(*) AS calls,
           SUM(duration_s) AS duration_s,
           SUM(cost_cents) AS cost_cents
      FROM calls ${where}
     GROUP BY type
     ORDER BY cost_cents DESC, calls DESC`).all(...params);

  return { totals, byType };
}

export function byExtension(db, filter) {
  const { where, params } = period(filter);
  return db.prepare(`
    SELECT extension,
           COUNT(*) AS calls,
           SUM(CASE WHEN direction = 'saida' THEN 1 ELSE 0 END) AS outgoing,
           SUM(duration_s) AS duration_s,
           SUM(cost_cents) AS cost_cents
      FROM calls ${where}
     GROUP BY extension
     ORDER BY cost_cents DESC, duration_s DESC`).all(...params);
}

export function byHour(db, filter) {
  const { where, params } = period(filter);
  const rows = db.prepare(`
    SELECT CAST(substr(start, 12, 2) AS INTEGER) AS hour, COUNT(*) AS calls
      FROM calls ${where}
     GROUP BY hour`).all(...params);

  // Garante as 24 horas, inclusive as sem chamada.
  const counts = new Map(rows.map((r) => [r.hour, r.calls]));
  return Array.from({ length: 24 }, (_, hour) => ({ hour, calls: counts.get(hour) ?? 0 }));
}

export function longest(db, filter, limit = 10) {
  const { where, params } = period(filter);
  return db.prepare(`
    SELECT start, extension, number, type, duration_s, cost_cents
      FROM calls ${and(where, "direction = 'saida'")}
     ORDER BY duration_s DESC
     LIMIT ?`).all(...params, limit);
}
