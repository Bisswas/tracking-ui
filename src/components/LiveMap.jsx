import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import * as api from '../api.js';
import { fmt, formatAgo, formatDistance, formatDuration, toKmh } from '../utils.js';

const deviceIcon = L.divIcon({
  className: 'device-marker',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
const destIcon = L.divIcon({
  className: 'dest-marker',
  html: '📍',
  iconSize: [30, 30],
  iconAnchor: [15, 28],
});

const TRAIL_MINUTES = 30;
const MAX_TRAIL = 1000;

// Moves the map to the first position, then follows the phone while "Follow" is on
function MapController({ position, follow, firstFix, onUserDrag, onPick }) {
  const map = useMap();
  const centered = useRef(false);

  useMapEvents({
    dragstart: onUserDrag,
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });

  useEffect(() => {
    if (!position) return;
    if (!centered.current && firstFix) {
      centered.current = true;
      map.setView(position, 16);
    } else if (follow) {
      map.panTo(position, { animate: true });
    }
  }, [position, follow, firstFix, map]);

  return null;
}

export default function LiveMap({ device }) {
  const [latest, setLatest] = useState(null);
  const [trail, setTrail] = useState([]);
  const [follow, setFollow] = useState(true);
  const [dest, setDest] = useState(null);
  const [eta, setEta] = useState(null);
  const [etaError, setEtaError] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  const lastPointId = useRef(null);
  const latestRef = useRef(null);
  latestRef.current = latest;

  // clock so "x seconds ago" keeps counting
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // load the recent path once
  useEffect(() => {
    let cancelled = false;
    const to = new Date();
    const from = new Date(to.getTime() - TRAIL_MINUTES * 60 * 1000);
    api
      .history(device.id, { from: from.toISOString(), to: to.toISOString(), limit: 600 })
      .then((h) => {
        if (cancelled) return;
        setTrail(h.points.map((p) => [p.latitude, p.longitude]));
        if (h.points.length > 0) {
          const last = h.points[h.points.length - 1];
          lastPointId.current = last.id;
          setLatest(last);
        }
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [device.id]);

  // poll the latest position every 4 seconds
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const point = await api.latest(device.id);
        if (cancelled) return;
        setError('');
        if (point && point.id !== lastPointId.current) {
          lastPointId.current = point.id;
          setLatest(point);
          setTrail((t) => [...t.slice(-(MAX_TRAIL - 1)), [point.latitude, point.longitude]]);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    };
    poll();
    const timer = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [device.id]);

  // ETA to the chosen destination, refreshed every 15 seconds
  const loadEta = useCallback(async () => {
    if (!dest || !latestRef.current) return;
    try {
      setEta(await api.eta(device.id, dest.lat, dest.lng));
      setEtaError('');
    } catch (e) {
      setEtaError(e.message);
    }
  }, [dest, device.id]);

  useEffect(() => {
    setEta(null);
    setEtaError('');
    if (!dest) return undefined;
    loadEta();
    const timer = setInterval(loadEta, 15000);
    return () => clearInterval(timer);
  }, [dest, loadEta, latest !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const position = latest ? [latest.latitude, latest.longitude] : null;
  const ageSeconds = latest ? (now - new Date(latest.recordedAt).getTime()) / 1000 : null;
  const live = ageSeconds !== null && ageSeconds < 60;

  return (
    <div className="map-wrap">
      <MapContainer center={[20.5937, 78.9629]} zoom={4} className="map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController
          position={position}
          follow={follow}
          firstFix={latest !== null}
          onUserDrag={() => setFollow(false)}
          onPick={setDest}
        />
        {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.8 }} />}
        {position && <Marker position={position} icon={deviceIcon} />}
        {dest && <Marker position={[dest.lat, dest.lng]} icon={destIcon} />}
        {dest && position && (
          <Polyline positions={[position, [dest.lat, dest.lng]]} pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '6 8' }} />
        )}
      </MapContainer>

      <div className="map-card top">
        <div className="map-card-row">
          <strong>{device.name}</strong>
          <span className={`pill ${live ? 'on' : 'off'}`}>{live ? 'Live' : 'Offline'}</span>
        </div>
        {latest ? (
          <>
            <div className="muted small">Updated {formatAgo(latest.recordedAt, now)}</div>
            <div className="map-stats">
              <span>{latest.speed != null ? `${fmt(toKmh(latest.speed), 0)} km/h` : '- km/h'}</span>
              <span>{latest.accuracy != null ? `±${Math.round(latest.accuracy)} m` : ''}</span>
            </div>
          </>
        ) : (
          <div className="muted small">Waiting for the first position from this phone…</div>
        )}
        <div className="map-card-row gap">
          <button className={`btn small ${follow ? 'primary' : ''}`} onClick={() => setFollow((f) => !f)}>
            {follow ? 'Following' : 'Follow'}
          </button>
          {dest && (
            <button className="btn small ghost" onClick={() => setDest(null)}>
              Clear destination
            </button>
          )}
        </div>
        {error && <div className="form-error small">{error}</div>}
      </div>

      <div className="map-card bottom">
        {!dest && <span className="muted small">Click anywhere on the map to set a destination and see the arrival time.</span>}
        {dest && !latest && <span className="muted small">Waiting for the phone's position…</span>}
        {dest && latest && !eta && !etaError && <span className="muted small">Calculating route…</span>}
        {etaError && <span className="error-text small">{etaError}</span>}
        {eta && (
          <div className="eta">
            <div className="eta-main">{formatDuration(eta.durationSeconds)}</div>
            <div className="muted small">
              {formatDistance(eta.distanceMeters)} · arrives{' '}
              {new Date(eta.arrivalAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {eta.estimated && ' (rough estimate: routing service unavailable)'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
