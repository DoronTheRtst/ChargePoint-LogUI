function isValidTs(ts) {
  return Number.isFinite(ts);
}

export function fmt(ts, offset = 2) {
  if (!isValidTs(ts)) return '—';
  const d = new Date(ts + offset * 3600000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function fmtTime(ts, offset = 2) {
  if (!isValidTs(ts)) return '—';
  const d = new Date(ts + offset * 3600000);
  return d.toISOString().slice(11, 19);
}

export function fmtDate(ts, offset = 2) {
  if (!isValidTs(ts)) return '—';
  const d = new Date(ts + offset * 3600000);
  return d.toISOString().slice(0, 10);
}

export function fmtShort(ts, offset = 2) {
  if (!isValidTs(ts)) return '—';
  const d = new Date(ts + offset * 3600000);
  return d.toISOString().slice(5, 16).replace('T', ' ');
}

export function fmtDur(ms) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}
