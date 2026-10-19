import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';

const startIcon = L.divIcon({ className: 'path-start', html: '<span></span>', iconSize: [16, 16], iconAnchor: [8, 8] });
const endIcon = L.divIcon({ className: 'path-end', html: '<span></span>', iconSize: [16, 16], iconAnchor: [8, 8] });

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 16);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [24, 24] });
    }
  }, [positions, map]);
  return null;
}

// Shows the path travelled in the selected time range
export default function PathMap({ points }) {
  const positions = points.map((p) => [p.latitude, p.longitude]);
  return (
    <MapContainer center={[20.5937, 78.9629]} zoom={4} className="map small-map" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={positions} />
      {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#6366f1', weight: 4 }} />}
      {positions.length > 0 && <Marker position={positions[0]} icon={startIcon} />}
      {positions.length > 1 && <Marker position={positions[positions.length - 1]} icon={endIcon} />}
    </MapContainer>
  );
}
