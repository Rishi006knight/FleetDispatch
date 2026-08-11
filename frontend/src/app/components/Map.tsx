'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet global window types
interface MapProps {
  driverLocation?: { lat: number; lng: number } | null;
  pickupLocation?: { lat: number; lng: number } | null;
  dropLocation?: { lat: number; lng: number } | null;
  routeCoordinates?: Array<{ lat: number; lng: number }>;
  otherDrivers?: Array<{
    driverId: string;
    name: string;
    status: string;
    currentLocation: { lat: number; lng: number };
  }>;
  zoom?: number;
  center?: [number, number];
}

// Custom Leaflet Icons using L.divIcon with custom HTML and Tailwind classes
const createDriverIcon = (status: string) => {
  const colorClass = status === 'busy' ? 'bg-amber-500 border-amber-300' : 'bg-cyan-500 border-cyan-300';
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-6 h-6">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorClass}"></span>
        <span class="relative inline-flex rounded-full h-4.5 w-4.5 border-2 ${colorClass}"></span>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const createPickupIcon = () => {
  return L.divIcon({
    html: `
      <div class="flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-full border-2 border-emerald-400 text-white font-bold text-xs shadow-lg">
        ↑
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createDropIcon = () => {
  return L.divIcon({
    html: `
      <div class="flex items-center justify-center w-8 h-8 bg-rose-600 rounded-full border-2 border-rose-400 text-white font-bold text-xs shadow-lg">
        ↓
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Component to dynamically fit bounds of route coordinates
function ChangeView({ coordinates }: { coordinates: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [coordinates, map]);
  return null;
}

export default function Map({
  driverLocation,
  pickupLocation,
  dropLocation,
  routeCoordinates = [],
  otherDrivers = [],
  zoom = 13,
  center = [19.0760, 72.8777] // Default Mumbai
}: MapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="w-full h-full bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500">Loading Map...</div>;

  // Compile points to fit bounds
  const boundsPoints: Array<[number, number]> = [];
  if (driverLocation) boundsPoints.push([driverLocation.lat, driverLocation.lng]);
  if (pickupLocation) boundsPoints.push([pickupLocation.lat, pickupLocation.lng]);
  if (dropLocation) boundsPoints.push([dropLocation.lat, dropLocation.lng]);
  routeCoordinates.forEach(pt => boundsPoints.push([pt.lat, pt.lng]));

  // CartoDB Dark Matter tiles are perfect for dark themed UI
  const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="w-full h-full"
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
        />
        
        {/* Dynamic Bounds Auto-adjust */}
        {boundsPoints.length > 0 && <ChangeView coordinates={boundsPoints} />}

        {/* Pickup Marker */}
        {pickupLocation && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={createPickupIcon()}>
            <Popup>
              <div className="text-zinc-900 font-medium">Pickup Point</div>
              <div className="text-zinc-500 text-xs">{pickupLocation.address || 'Address'}</div>
            </Popup>
          </Marker>
        )}

        {/* Drop Marker */}
        {dropLocation && (
          <Marker position={[dropLocation.lat, dropLocation.lng]} icon={createDropIcon()}>
            <Popup>
              <div className="text-zinc-900 font-medium">Dropoff Destination</div>
              <div className="text-zinc-500 text-xs">{dropLocation.address || 'Address'}</div>
            </Popup>
          </Marker>
        )}

        {/* Driver Marker */}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createDriverIcon('busy')}>
            <Popup>
              <div className="text-zinc-900 font-medium">Active Delivery Driver</div>
              <div className="text-zinc-500 text-xs">Coordinates: {driverLocation.lat.toFixed(5)}, {driverLocation.lng.toFixed(5)}</div>
            </Popup>
          </Marker>
        )}

        {/* Route Line */}
        {routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates.map(pt => [pt.lat, pt.lng])} 
            color="#06b6d4" // Cyan 500
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Other Fleet Drivers */}
        {otherDrivers.map((drv, idx) => {
          // If we have active driverLocation, don't double render this driver
          if (driverLocation && L.latLng(driverLocation.lat, driverLocation.lng).distanceTo([drv.currentLocation.lat, drv.currentLocation.lng]) < 5) {
            return null;
          }
          return (
            <Marker 
              key={drv.driverId || idx}
              position={[drv.currentLocation.lat, drv.currentLocation.lng]} 
              icon={createDriverIcon(drv.status)}
            >
              <Popup>
                <div className="text-zinc-900 font-semibold">{drv.name} ({drv.driverId})</div>
                <div className="text-zinc-500 text-xs capitalize">Status: {drv.status}</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
