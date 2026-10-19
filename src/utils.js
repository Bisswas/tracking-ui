export const RANGES = [
  { key: '15m', label: 'Last 15 minutes', ms: 15 * 60 * 1000 },
  { key: '1h', label: 'Last hour', ms: 60 * 60 * 1000 },
  { key: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: 'custom', label: 'Custom range' },
];

// Turns a range choice into ISO times for the API. Returns null when a custom range is incomplete.
export function resolveRange(key, custom) {
  if (key === 'custom') {
    const from = new Date(custom.from);
    const to = new Date(custom.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const range = RANGES.find((r) => r.key === key);
  const to = new Date();
  return { from: new Date(to.getTime() - range.ms).toISOString(), to: to.toISOString() };
}

export function formatAgo(iso, now = Date.now()) {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export function formatDuration(totalSeconds) {
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function formatDistance(meters) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export const toKmh = (metersPerSecond) =>
  metersPerSecond === null || metersPerSecond === undefined ? null : metersPerSecond * 3.6;

export const fmt = (value, digits = 1) =>
  value === null || value === undefined ? '-' : Number(value).toFixed(digits);

export function pointsToCsv(points) {
  const header = 'time,latitude,longitude,speed_kmh,heading_deg,accuracy_m';
  const lines = points.map((p) =>
    [
      p.recordedAt,
      p.latitude,
      p.longitude,
      p.speed == null ? '' : (p.speed * 3.6).toFixed(1),
      p.heading == null ? '' : Math.round(p.heading),
      p.accuracy == null ? '' : Math.round(p.accuracy),
    ].join(',')
  );
  return [header, ...lines].join('\n');
}

export function downloadText(filename, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
