'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TAMIL_NADU_CENTER, TAMIL_NADU_DEFAULT_ZOOM, TAMIL_NADU_WAREHOUSES, WarehouseLocation } from '../constants/locations';

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
  showWarehouses?: boolean;
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
        <span class="relative inline-flex rounded-full h-4.5 w-4.5 border-2 ${colorClass} shadow-md shadow-cyan-500/50"></span>
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
      <div class="flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-full border-2 border-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/30">
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
      <div class="flex items-center justify-center w-8 h-8 bg-rose-600 rounded-full border-2 border-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/30">
        ↓
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createWarehouseIcon = (type: string) => {
  const isPrimary = type === 'Primary Gateway';
  const isPort = type === 'Port Terminal';
  const bgClass = isPort ? 'bg-blue-600 border-blue-400 text-blue-100' : isPrimary ? 'bg-indigo-600 border-indigo-400 text-indigo-100' : 'bg-amber-600 border-amber-400 text-amber-100';
  
  return L.divIcon({
    html: `
      <div class="flex items-center justify-center w-7 h-7 ${bgClass} rounded-lg border shadow-md hover:scale-110 transition-transform cursor-pointer font-bold text-[11px]">
        ⬢
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

// Component to dynamically fit bounds of route coordinates
function ChangeView({ coordinates }: { coordinates: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
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
  showWarehouses = true,
  zoom = TAMIL_NADU_DEFAULT_ZOOM,
  center = TAMIL_NADU_CENTER
}: MapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="w-full h-full bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500">Loading Tamil Nadu Logistics Map...</div>;

  // Compile points to fit bounds only if active order or active driver route is present
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

        {/* 15 Tamil Nadu Warehouses / Logistics Hubs */}
        {showWarehouses && TAMIL_NADU_WAREHOUSES.map((wh) => (
          <Marker 
            key={wh.id} 
            position={[wh.lat, wh.lng]} 
            icon={createWarehouseIcon(wh.type)}
          >
            <Popup>
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-1 mb-1">
                  <span className="text-zinc-950 font-bold text-sm">{wh.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">{wh.type}</span>
                </div>
                <p className="text-zinc-600 text-xs mb-1.5">{wh.address}</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] bg-zinc-50 p-1.5 rounded border border-zinc-200">
                  <div>
                    <span className="text-zinc-400 block text-[9px] uppercase font-semibold">Capacity</span>
                    <span className="font-bold text-zinc-800">{wh.capacityTonnes} MT</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[9px] uppercase font-semibold">Active Fleet</span>
                    <span className="font-bold text-emerald-600">{wh.activeFleet} Vehicles</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

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
            opacity={0.85}
          />
        )}

        {/* Other Fleet Drivers */}
        {otherDrivers.map((drv, idx) => {
          if (!drv.currentLocation) return null;
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
