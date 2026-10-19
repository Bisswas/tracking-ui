import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../api.js';
import { RANGES, downloadText, fmt, pointsToCsv, resolveRange, toKmh } from '../utils.js';
import { BarChart, LineChart } from './Charts.jsx';
import PathMap from './PathMap.jsx';

const PAGE_SIZE = 15;

function bucketLabel(iso, bucketSeconds) {
  const d = new Date(iso);
  if (bucketSeconds >= 21600) {
    return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit' });
  }
  if (bucketSeconds >= 1800) {
    return d.toLocaleString([], { day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Card({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="muted small">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

// "Kibana-style" view of one device: time range, summary, histogram, path and a searchable table
export default function Analytics({ device }) {
  const [rangeKey, setRangeKey] = useState('1h');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [auto, setAuto] = useState(false);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [minSpeed, setMinSpeed] = useState('');
  const [maxAccuracy, setMaxAccuracy] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    const range = resolveRange(rangeKey, custom);
    if (!range) {
      setError('Choose a start and end time for the custom range.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [s, h] = await Promise.all([
        api.stats(device.id, range),
        api.history(device.id, { ...range, limit: 5000 }),
      ]);
      setStats(s);
      setHistory(h);
      setPage(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [device.id, rangeKey, custom]);

  useEffect(() => {
    if (rangeKey === 'custom' && (!custom.from || !custom.to)) return undefined;
    load();
    if (!auto) return undefined;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load, auto, rangeKey, custom]);

  const filtered = useMemo(() => {
    if (!history) return [];
    const minKmh = minSpeed === '' ? null : Number(minSpeed);
    const maxAcc = maxAccuracy === '' ? null : Number(maxAccuracy);
    const list = history.points.filter((p) => {
      if (minKmh !== null && (p.speed == null || p.speed * 3.6 < minKmh)) return false;
      if (maxAcc !== null && (p.accuracy == null || p.accuracy > maxAcc)) return false;
      return true;
    });
    return newestFirst ? [...list].reverse() : list;
  }, [history, minSpeed, maxAccuracy, newestFirst]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const countData = stats ? stats.buckets.map((b) => ({ label: bucketLabel(b.start, stats.bucketSeconds), value: b.count })) : [];
  const speedData = stats
    ? stats.buckets.map((b) => ({ label: bucketLabel(b.start, stats.bucketSeconds), value: b.avgSpeedKmh }))
    : [];

  const pathPoints = history ? history.points : [];

  return (
    <div className="analytics">
      <div className="toolbar">
        <label className="field inline">
          <span>Time range</span>
          <select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)}>
            {RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {rangeKey === 'custom' && (
          <>
            <label className="field inline">
              <span>From</span>
              <input type="datetime-local" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            </label>
            <label className="field inline">
              <span>To</span>
              <input type="datetime-local" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </label>
          </>
        )}
        <button className="btn small" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
        <label className="check">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto refresh (15 s)
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}

      {stats && (
        <>
          {(stats.truncated || history?.truncated) && (
            <div className="notice">
              This range has more points than can be shown at once, so charts and the table use the most recent ones.
              Pick a shorter range for full detail.
            </div>
          )}

          <div className="stat-grid">
            <Card label="Points" value={stats.count.toLocaleString()} />
            <Card label="Distance" value={`${fmt(stats.distanceKm, 2)} km`} />
            <Card label="Average speed" value={`${fmt(stats.avgSpeedKmh, 1)} km/h`} />
            <Card label="Top speed" value={`${fmt(stats.maxSpeedKmh, 1)} km/h`} />
            <Card label="First point" value={stats.firstAt ? new Date(stats.firstAt).toLocaleTimeString() : '-'} sub={stats.firstAt ? new Date(stats.firstAt).toLocaleDateString() : ''} />
            <Card label="Last point" value={stats.lastAt ? new Date(stats.lastAt).toLocaleTimeString() : '-'} sub={stats.lastAt ? new Date(stats.lastAt).toLocaleDateString() : ''} />
          </div>

          <div className="chart-grid">
            <section className="panel">
              <h3>Points over time</h3>
              <BarChart data={countData} />
            </section>
            <section className="panel">
              <h3>Average speed over time</h3>
              <LineChart data={speedData} unit=" km/h" />
            </section>
          </div>

          <section className="panel">
            <h3>Path in this range</h3>
            {pathPoints.length === 0 ? <div className="chart-empty">No positions in this range</div> : <PathMap points={pathPoints} />}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Positions</h3>
              <div className="filters">
                <label className="field inline">
                  <span>Min speed (km/h)</span>
                  <input type="number" min="0" value={minSpeed} onChange={(e) => { setMinSpeed(e.target.value); setPage(0); }} />
                </label>
                <label className="field inline">
                  <span>Max accuracy (m)</span>
                  <input type="number" min="0" value={maxAccuracy} onChange={(e) => { setMaxAccuracy(e.target.value); setPage(0); }} />
                </label>
                <button className="btn small" onClick={() => setNewestFirst((n) => !n)}>
                  {newestFirst ? 'Newest first ↓' : 'Oldest first ↑'}
                </button>
                <button
                  className="btn small"
                  disabled={filtered.length === 0}
                  onClick={() => downloadText(`${device.name.replace(/\W+/g, '_')}_positions.csv`, pointsToCsv(filtered))}
                >
                  ⬇ CSV
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Speed (km/h)</th>
                    <th>Heading</th>
                    <th>Accuracy (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.recordedAt).toLocaleString()}</td>
                      <td>{p.latitude.toFixed(6)}</td>
                      <td>{p.longitude.toFixed(6)}</td>
                      <td>{p.speed == null ? '-' : fmt(toKmh(p.speed), 1)}</td>
                      <td>{p.heading == null ? '-' : `${Math.round(p.heading)}°`}</td>
                      <td>{p.accuracy == null ? '-' : Math.round(p.accuracy)}</td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan="6" className="muted center">
                        No positions match
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <button className="btn small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
              <span className="muted small">
                {filtered.length.toLocaleString()} rows · page {page + 1} of {pageCount}
              </span>
              <button className="btn small" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>
                Next →
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
