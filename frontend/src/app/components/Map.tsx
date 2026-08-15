'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TAMIL_NADU_CENTER, TAMIL_NADU_DEFAULT_ZOOM, TAMIL_NADU_WAREHOUSES, WarehouseLocation } from '../constants/locations';

// Fix Leaflet global window types
interface MapProps {
  driverLocation?: { lat: number; lng: number } | null;
  pickupLocation?: { lat: number; lng: number; address?: string; name?: string } | null;
  dropLocation?: { lat: number; lng: number; address?: string; name?: string } | null;
  routeCoordinates?: Array<{ lat: number; lng: number }>;
  routeInfo?: {
    originName?: string;
    destName?: string;
    distanceKm?: number;
    etaMinutes?: number;
    status?: string;
    vehicleId?: string;
  };
  otherDrivers?: Array<{
    driverId: string;
    name: string;
    status: string;
    currentLocation: { lat: number; lng: number };
  }>;
  activeOrders?: Array<{
    orderId: string;
    pickup: { lat: number; lng: number; address?: string };
    drop: { lat: number; lng: number; address?: string };
    routeCoordinates?: Array<{ lat: number; lng: number }>;
    status: string;
    price?: number;
  }>;
  showWarehouses?: boolean;
  zoom?: number;
  center?: [number, number];
}

// Custom Leaflet Icons using L.divIcon with custom HTML and Tailwind classes
const createDriverIcon = (status: string) => {
  const isBusy = status === 'busy';
  const colorClass = isBusy ? 'bg-amber-500 border-amber-300' : 'bg-cyan-500 border-cyan-300';
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-7 h-7">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorClass}"></span>
        <span class="relative inline-flex rounded-full h-5 w-5 border-2 ${colorClass} shadow-lg shadow-cyan-500/50 flex items-center justify-center text-[10px]">
          🚛
        </span>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const createPickupIcon = () => {
  return L.divIcon({
    html: `
      <div class="flex items-center justify-center w-8 h-8 bg-emerald-600 rounded-full border-2 border-emerald-300 text-white font-black text-xs shadow-lg shadow-emerald-500/50 hover:scale-110 transition-transform">
        ▲
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
      <div class="flex items-center justify-center w-8 h-8 bg-rose-600 rounded-full border-2 border-rose-300 text-white font-black text-xs shadow-lg shadow-rose-500/50 hover:scale-110 transition-transform">
        ▼
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createWarehouseIcon = (type: string) => {
  const isPort = type === 'Port Terminal';
  const isPrimary = type === 'Primary Gateway';
  const bgClass = isPort ? 'bg-blue-600 border-blue-400 text-blue-100' : isPrimary ? 'bg-indigo-600 border-indigo-400 text-indigo-100' : 'bg-emerald-600 border-emerald-400 text-emerald-100';
  
  return L.divIcon({
    html: `
      <div class="flex items-center justify-center w-7 h-7 ${bgClass} rounded-xl border shadow-md hover:scale-110 transition-transform cursor-pointer font-bold text-[11px]">
        ⬢
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

// Distinct directional route color resolver
export function resolveRouteColor(originText: string = '', destText: string = ''): string {
  const origin = originText.toLowerCase();
  const dest = destText.toLowerCase();

  // Specific user request: Coimbatore -> Madurai (Light Red), Madurai -> Coimbatore (Dark Red)
  if (origin.includes('coimbatore') && dest.includes('madurai')) return '#f87171'; // Light Red (Coral)
  if (origin.includes('madurai') && dest.includes('coimbatore')) return '#991b1b'; // Dark Red (Maroon)

  // Chennai <-> Coimbatore
  if (origin.includes('chennai') && dest.includes('coimbatore')) return '#38bdf8'; // Sky Cyan
  if (origin.includes('coimbatore') && dest.includes('chennai')) return '#1e40af'; // Deep Royal Navy

  // Chennai <-> Madurai
  if (origin.includes('chennai') && dest.includes('madurai')) return '#fbbf24'; // Bright Amber
  if (origin.includes('madurai') && dest.includes('chennai')) return '#c2410c'; // Deep Orange / Rust

  // Salem <-> Trichy
  if (origin.includes('salem') && dest.includes('trichy')) return '#34d399'; // Bright Mint Emerald
  if (origin.includes('trichy') && dest.includes('salem')) return '#065f46'; // Forest Green

  // Thoothukudi Corridors
  if (origin.includes('thoothukudi')) return '#8b5cf6'; // Vivid Purple
  if (dest.includes('thoothukudi')) return '#4c1d95'; // Dark Indigo / Deep Violet

  // Hosur Corridors
  if (origin.includes('hosur')) return '#f43f5e'; // Rose Pink
  if (dest.includes('hosur')) return '#881337'; // Wine Berry

  // Tirunelveli Corridors
  if (origin.includes('tirunelveli')) return '#22d3ee'; // Light Teal
  if (dest.includes('tirunelveli')) return '#0e7490'; // Dark Teal

  // Erode Corridors
  if (origin.includes('erode')) return '#a3e635'; // Lime Light Green
  if (dest.includes('erode')) return '#3f6212'; // Olive Green

  // Default Directional contrasting colors
  return '#06b6d4'; // Cyan default
}

// Component to dynamically fit bounds of route coordinates
function ChangeView({ coordinates }: { coordinates: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [coordinates, map]);
  return null;
}

export default function Map({
  driverLocation,
  pickupLocation,
  dropLocation,
  routeCoordinates = [],
  routeInfo,
  otherDrivers = [],
  activeOrders = [],
  showWarehouses = true,
  zoom = TAMIL_NADU_DEFAULT_ZOOM,
  center = TAMIL_NADU_CENTER
}: MapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [osmRoadCoordinates, setOsmRoadCoordinates] = useState<Array<{ lat: number; lng: number }>>([]);
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch real OSM road network geometry if pickup and drop are present
  useEffect(() => {
    if (pickupLocation && dropLocation) {
      let isSubscribed = true;
      const fetchOsmRoute = async () => {
        try {
          const pLat = pickupLocation.lat;
          const pLng = pickupLocation.lng;
          const dLat = dropLocation.lat;
          const dLng = dropLocation.lng;

          const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.code === 'Ok' && data.routes && data.routes.length > 0 && isSubscribed) {
              const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => ({
                lat: c[1],
                lng: c[0]
              }));
              const distKm = Math.round((data.routes[0].distance / 1000) * 10) / 10;
              const durMin = Math.round((data.routes[0].duration / 60));
              setOsmRoadCoordinates(coords);
              setRouteStats({ distanceKm: distKm, durationMin: durMin });
            }
          }
        } catch (err) {
          // Fallback gracefully
        }
      };

      fetchOsmRoute();
      return () => {
        isSubscribed = false;
      };
    } else {
      setOsmRoadCoordinates([]);
      setRouteStats(null);
    }
  }, [pickupLocation?.lat, pickupLocation?.lng, dropLocation?.lat, dropLocation?.lng]);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-500 text-xs font-mono">
        Loading Quantum Express Real Road Logistics Map...
      </div>
    );
  }

  // Choose the best available road route:
  // If we have downloaded OSM road coordinates, use those. Otherwise use passed routeCoordinates.
  const activeRoadPath = osmRoadCoordinates.length > 0 
    ? osmRoadCoordinates 
    : routeCoordinates;

  // Compile points to fit bounds
  const boundsPoints: Array<[number, number]> = [];
  if (driverLocation) boundsPoints.push([driverLocation.lat, driverLocation.lng]);
  if (pickupLocation) boundsPoints.push([pickupLocation.lat, pickupLocation.lng]);
  if (dropLocation) boundsPoints.push([dropLocation.lat, dropLocation.lng]);
  activeRoadPath.forEach(pt => boundsPoints.push([pt.lat, pt.lng]));

  // Resolve Route Color
  const originAddress = pickupLocation?.address || routeInfo?.originName || 'Origin Hub';
  const destAddress = dropLocation?.address || routeInfo?.destName || 'Destination Terminal';
  const currentRouteColor = resolveRouteColor(originAddress, destAddress);

  // CartoDB Dark Matter tiles
  const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const calculatedDistKm = routeStats?.distanceKm || routeInfo?.distanceKm || 185;
  const calculatedEtaHours = (calculatedDistKm / 45).toFixed(1);

  return (
    <div className="w-full h-full relative font-sans" style={{ minHeight: '320px' }}>
      
      {/* Real-time Highway Route Legend Chip */}
      {(pickupLocation && dropLocation) && (
        <div className="absolute top-3 right-3 z-[400] bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-md rounded-xl px-3 py-2 text-xs shadow-xl flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded-full shadow-md" style={{ backgroundColor: currentRouteColor }}></div>
          <div>
            <div className="font-bold text-white text-[11px] truncate max-w-[200px]">
              {originAddress.split(',')[0]} ➔ {destAddress.split(',')[0]}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              OSM Highway: ~{calculatedDistKm} km • ~{calculatedEtaHours} hrs
            </div>
          </div>
        </div>
      )}

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

        {/* 16 Tamil Nadu Warehouses & Logistics Hubs */}
        {showWarehouses && TAMIL_NADU_WAREHOUSES.map((wh) => (
          <Marker 
            key={wh.id} 
            position={[wh.lat, wh.lng]} 
            icon={createWarehouseIcon(wh.type)}
          >
            <Popup>
              <div className="p-1 min-w-[220px]">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-1 mb-1">
                  <span className="text-zinc-950 font-extrabold text-sm">{wh.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">{wh.type}</span>
                </div>
                <p className="text-zinc-600 text-xs mb-2 leading-tight">{wh.address}</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] bg-zinc-50 p-1.5 rounded-lg border border-zinc-200">
                  <div>
                    <span className="text-zinc-400 block text-[9px] uppercase font-bold">Storage Cap</span>
                    <span className="font-extrabold text-zinc-800">{wh.capacityTonnes} MT</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[9px] uppercase font-bold">Active Fleet</span>
                    <span className="font-extrabold text-emerald-600">{wh.activeFleet} Commercial Trucks</span>
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
              <div className="p-1">
                <div className="text-emerald-700 font-extrabold text-xs uppercase flex items-center gap-1">
                  <span>▲</span> Pickup Loading Bay
                </div>
                <div className="text-zinc-900 font-bold text-xs mt-0.5">{pickupLocation.address || 'Pickup Point'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Drop Marker */}
        {dropLocation && (
          <Marker position={[dropLocation.lat, dropLocation.lng]} icon={createDropIcon()}>
            <Popup>
              <div className="p-1">
                <div className="text-rose-700 font-extrabold text-xs uppercase flex items-center gap-1">
                  <span>▼</span> Destination Terminal / Port CFS
                </div>
                <div className="text-zinc-900 font-bold text-xs mt-0.5">{dropLocation.address || 'Dropoff Destination'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Active Driver Marker */}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createDriverIcon('busy')}>
            <Popup>
              <div className="p-1">
                <div className="text-amber-700 font-bold text-xs uppercase">Active Cargo Truck En Route</div>
                <div className="text-zinc-800 text-xs font-mono mt-0.5">
                  GPS: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Real OSM Highway Road Network Route Line with Directional Color & Click Information */}
        {activeRoadPath.length > 0 && (
          <>
            {/* Outer Glow / Shadow line */}
            <Polyline 
              positions={activeRoadPath.map(pt => [pt.lat, pt.lng])} 
              color={currentRouteColor}
              weight={8}
              opacity={0.3}
            />
            {/* Main Road Line */}
            <Polyline 
              positions={activeRoadPath.map(pt => [pt.lat, pt.lng])} 
              color={currentRouteColor}
              weight={5}
              opacity={0.95}
              eventHandlers={{
                click: () => {
                  console.log(`Route clicked: ${originAddress} -> ${destAddress}`);
                }
              }}
            >
              {/* Interactive Tooltip & Click Popup for Route Info */}
              <Tooltip sticky>
                <div className="text-xs font-sans">
                  <div className="font-black text-zinc-900">
                    {originAddress.split(',')[0]} ➔ {destAddress.split(',')[0]}
                  </div>
                  <div className="text-zinc-600 text-[11px] mt-0.5">
                    🛣️ OSM Road Network: ~{calculatedDistKm} km • Highway Transit: ~{calculatedEtaHours} hrs
                  </div>
                </div>
              </Tooltip>

              <Popup>
                <div className="p-1.5 min-w-[240px]">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1 mb-1.5">
                    <span className="font-extrabold text-xs text-zinc-900">Highway Transit Corridor</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: currentRouteColor + '20', color: currentRouteColor }}>
                      OSM Highway
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-800 mb-1">
                    {originAddress.split(',')[0]} ➔ {destAddress.split(',')[0]}
                  </p>
                  <p className="text-[11px] text-zinc-600 mb-1.5">
                    <strong>Distance:</strong> {calculatedDistKm} km &bull; <strong>Transit ETA:</strong> {calculatedEtaHours} hours
                  </p>
                  <div className="text-[10px] bg-zinc-100 p-1.5 rounded border border-zinc-200 text-zinc-700">
                    Status: <strong className="text-emerald-700 uppercase">{routeInfo?.status || 'Active Road Freight'}</strong>
                    {routeInfo?.vehicleId && <span> &bull; Vehicle: <strong>{routeInfo.vehicleId}</strong></span>}
                  </div>
                </div>
              </Popup>
            </Polyline>
          </>
        )}

        {/* Other Fleet Drivers Stationed across Tamil Nadu */}
        {otherDrivers.map((drv, idx) => {
          if (!drv.currentLocation) return null;
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
                <div className="p-1 min-w-[180px]">
                  <div className="text-zinc-950 font-bold text-xs">{drv.name}</div>
                  <div className="text-zinc-600 text-[11px] mt-0.5">
                    Vehicle: <strong className="font-mono text-zinc-800">{drv.driverId}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500 capitalize">Status: {drv.status}</span>
                    <span className="text-emerald-600 font-bold">Stationed at Hub</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
