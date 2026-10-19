import { formatAgo, fmt, toKmh } from '../utils.js';

export default function DeviceList({ devices, selectedId, onSelect, onAdd, onRemove, now }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h2>My devices</h2>
        <button className="btn primary small" onClick={onAdd}>
          ＋ Add device
        </button>
      </div>

      {devices.length === 0 && (
        <div className="empty-small">
          <p>No devices yet.</p>
          <p className="muted small">
            Click <b>Add device</b>, then type the code it shows into the Live Tracker app on your phone.
          </p>
        </div>
      )}

      <ul className="device-list">
        {devices.map((d) => (
          <li key={d.id}>
            <div
              className={`device ${d.id === selectedId ? 'selected' : ''}`}
              onClick={() => onSelect(d.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(d.id)}
            >
              <div className="device-top">
                <span className={`dot ${d.online ? 'on' : 'off'}`} />
                <strong>{d.name}</strong>
                <button
                  className="icon-btn"
                  title="Remove device"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(d);
                  }}
                >
                  🗑
                </button>
              </div>
              <div className="muted small">
                {d.online ? 'Live now' : d.lastSeenAt ? `Last seen ${formatAgo(d.lastSeenAt, now)}` : 'Waiting for first position'}
              </div>
              {d.latest && (
                <div className="muted small">
                  {fmt(d.latest.latitude, 5)}, {fmt(d.latest.longitude, 5)}
                  {d.latest.speed != null && ` · ${fmt(toKmh(d.latest.speed), 0)} km/h`}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
