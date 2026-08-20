export const ITEMS = {
  stream: { label: 'ตะกอนท้องน้ำ', total: 418 },
  weathered: { label: 'ชั้นดินผุพังอยู่กับที่', total: 418 },
  heavy: { label: 'ตัวอย่างแร่หนัก', total: 418 },
  bsoil: { label: 'ดินชั้น B', total: 30 },
};

const MAIN_BATCHES = [
  ['2026-09-01', '2026-09-05', 100],
  ['2026-09-15', '2026-09-20', 100],
  ['2026-09-25', '2026-09-30', 120],
  ['2026-10-01', '2026-10-05', 98],
];

const B_BATCHES = [['2026-10-11', '2026-10-15', 30]];

const day = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

export function targetFor(dateStr, key) {
  const batches = key === 'bsoil' ? B_BATCHES : MAIN_BATCHES;
  const total = ITEMS[key].total;
  const current = day(dateStr);
  let cumulative = 0;

  for (const [start, end, qty] of batches) {
    const ds = day(start);
    const de = day(end);
    if (current < ds) break;
    if (current > de) {
      cumulative += qty;
      continue;
    }
    const span = de - ds + 1;
    const elapsed = current - ds + 1;
    cumulative += Math.ceil((qty * elapsed) / span);
    break;
  }
  return Math.min(total, cumulative);
}

export function projectSummary(dateStr, values) {
  const keys = Object.keys(ITEMS);
  const rows = keys.map((key) => {
    const actual = Math.max(0, Math.min(ITEMS[key].total, Number(values[key] || 0)));
    const target = targetFor(dateStr, key);
    return {
      key,
      label: ITEMS[key].label,
      total: ITEMS[key].total,
      actual,
      target,
      gap: actual - target,
      progress: actual / ITEMS[key].total * 100,
    };
  });

  const totalProject = rows.reduce((s, r) => s + r.total, 0);
  const actualTotal = rows.reduce((s, r) => s + r.actual, 0);
  const targetTotal = rows.reduce((s, r) => s + r.target, 0);
  return {
    rows,
    totalProject,
    actualTotal,
    targetTotal,
    actualPct: actualTotal / totalProject * 100,
    targetPct: targetTotal / totalProject * 100,
    behind: actualTotal < targetTotal,
  };
}
