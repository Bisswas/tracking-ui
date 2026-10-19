// Small dependency-free SVG charts. Colours come from CSS (see .chart-* in styles.css).
const W = 600;
const PAD = { left: 40, right: 8, top: 10, bottom: 24 };

function niceMax(value) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function XLabels({ data, height }) {
  if (data.length === 0) return null;
  const idx = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  const step = (W - PAD.left - PAD.right) / data.length;
  return idx.map((i) => (
    <text key={i} className="chart-label" x={PAD.left + step * (i + 0.5)} y={height - 6} textAnchor="middle">
      {data[i].label}
    </text>
  ));
}

function YAxis({ max, height, unit }) {
  const plotH = height - PAD.top - PAD.bottom;
  return [0, 0.5, 1].map((f) => {
    const y = PAD.top + plotH * (1 - f);
    return (
      <g key={f}>
        <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} />
        <text className="chart-label" x={PAD.left - 6} y={y + 4} textAnchor="end">
          {Math.round(max * f * 10) / 10}
          {f === 1 ? unit : ''}
        </text>
      </g>
    );
  });
}

export function BarChart({ data, height = 180, unit = '' }) {
  const peak = Math.max(0, ...data.map((d) => d.value));
  if (data.length === 0 || peak === 0) return <div className="chart-empty">No data in this range</div>;
  const max = niceMax(peak);
  const plotH = height - PAD.top - PAD.bottom;
  const step = (W - PAD.left - PAD.right) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="chart" role="img">
      <YAxis max={max} height={height} unit={unit} />
      {data.map((d, i) => {
        const h = (d.value / max) * plotH;
        return (
          <rect
            key={i}
            className="chart-bar"
            x={PAD.left + step * i + step * 0.1}
            y={PAD.top + plotH - h}
            width={Math.max(1, step * 0.8)}
            height={h}
            rx="2"
          >
            <title>{`${d.label}: ${d.value}`}</title>
          </rect>
        );
      })}
      <XLabels data={data} height={height} />
    </svg>
  );
}

export function LineChart({ data, height = 180, unit = '' }) {
  const values = data.map((d) => d.value).filter((v) => v !== null && v !== undefined);
  if (data.length === 0 || values.length === 0) return <div className="chart-empty">No data in this range</div>;
  const max = niceMax(Math.max(...values));
  const plotH = height - PAD.top - PAD.bottom;
  const step = (W - PAD.left - PAD.right) / data.length;
  const x = (i) => PAD.left + step * (i + 0.5);
  const y = (v) => PAD.top + plotH * (1 - v / max);

  // break the line where a bucket has no value
  const segments = [];
  let current = [];
  data.forEach((d, i) => {
    if (d.value === null || d.value === undefined) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push([x(i), y(d.value)]);
    }
  });
  if (current.length) segments.push(current);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="chart" role="img">
      <YAxis max={max} height={height} unit={unit} />
      {segments.map((seg, i) => (
        <polyline key={i} className="chart-line" fill="none" points={seg.map((p) => p.join(',')).join(' ')} />
      ))}
      {data.map(
        (d, i) =>
          d.value !== null &&
          d.value !== undefined && (
            <circle key={i} className="chart-dot" cx={x(i)} cy={y(d.value)} r="2.5">
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          )
      )}
      <XLabels data={data} height={height} />
    </svg>
  );
}
