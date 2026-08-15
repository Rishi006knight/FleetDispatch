'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TAMIL_NADU_CENTER, TAMIL_NADU_DEFAULT_ZOOM, TAMIL_NADU_WAREHOUSES, WarehouseLocation } from '../constants/locations';

export interface MapProps {
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

// Hub Type Color Mapping
const getHubColors = (type: string) => {
  switch (type) {
    case 'Port Terminal':
      return { main: '#e67e22', bg: 'rgba(230, 126, 34, 0.15)', text: '#c25e00', border: '#e67e22' };
    case 'Primary Gateway':
      return { main: '#f39c12', bg: 'rgba(243, 156, 18, 0.15)', text: '#b36b00', border: '#f39c12' };
    case 'Industrial Hub':
      return { main: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', text: '#1d4ed8', border: '#3b82f6' };
    case 'Regional Hub':
    default:
      return { main: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)', text: '#0f766e', border: '#14b8a6' };
  }
};

// Hub Markers with proportional sizing
const createWarehouseIcon = (wh: WarehouseLocation) => {
  const colors = getHubColors(wh.type);
  // Size mapped proportionally between 22px and 34px
  const size = Math.max(22, Math.min(34, Math.round(18 + (wh.capacityTonnes / 3500) * 16)));
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px; 
        height: ${size}px; 
        background: ${colors.main}; 
        border: 2.5px solid #ffffff; 
        border-radius: 50%; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.18), 0 0 0 2px ${colors.main}33;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 700;
        font-size: 10px;
        transition: transform 0.2s ease;
        cursor: pointer;
      ">
        <span style="transform: translateY(-0.5px);">${wh.activeFleet}</span>
      </div>
    `,
    className: 'qe-hub-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const createDriverIcon = (status: string) => {
  const isBusy = status === 'busy';
  const color = isBusy ? '#e67e22' : '#10b981';
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
        <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.4; animation: pulse-ring 2s infinite;"></span>
        <div style="
          width: 24px; 
          height: 24px; 
          background: #ffffff; 
          border: 2.5px solid ${color}; 
          border-radius: 50%; 
          box-shadow: 0 4px 10px rgba(0,0,0,0.2); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 12px;
        ">
          🚛
        </div>
      </div>
    `,
    className: 'qe-driver-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createPickupIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 32px; 
        height: 32px; 
        background: #10b981; 
        border: 2.5px solid #ffffff; 
        border-radius: 50%; 
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: #ffffff; 
        font-weight: 800; 
        font-size: 13px;
      ">
        ▲
      </div>
    `,
    className: 'qe-pickup-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createDropIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 32px; 
        height: 32px; 
        background: #e67e22; 
        border: 2.5px solid #ffffff; 
        border-radius: 50%; 
        box-shadow: 0 4px 12px rgba(230, 126, 34, 0.4); 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: #ffffff; 
        font-weight: 800; 
        font-size: 13px;
      ">
        ▼
      </div>
    `,
    className: 'qe-drop-icon',
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
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
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
              const durMin = Math.round(data.routes[0].duration / 60);
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
      <div className="w-full h-full bg-[#f8f9fb] rounded-xl flex items-center justify-center text-zinc-400 text-xs font-medium">
        Loading Quantum Express Positron Light Map...
      </div>
    );
  }

  const activeRoadPath = osmRoadCoordinates.length > 0 ? osmRoadCoordinates : routeCoordinates;

  // Compile points to fit bounds
  const boundsPoints: Array<[number, number]> = [];
  if (driverLocation) boundsPoints.push([driverLocation.lat, driverLocation.lng]);
  if (pickupLocation) boundsPoints.push([pickupLocation.lat, pickupLocation.lng]);
  if (dropLocation) boundsPoints.push([dropLocation.lat, dropLocation.lng]);
  activeRoadPath.forEach(pt => boundsPoints.push([pt.lat, pt.lng]));

  // CartoDB Positron (Clean Light Tiles)
  const tileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const originAddress = pickupLocation?.address || routeInfo?.originName || 'Origin Hub';
  const destAddress = dropLocation?.address || routeInfo?.destName || 'Destination Terminal';
  const calculatedDistKm = routeStats?.distanceKm || routeInfo?.distanceKm || 185;
  const calculatedEtaHours = (calculatedDistKm / 45).toFixed(1);

  return (
    <div className="w-full h-full relative font-sans" style={{ minHeight: '320px' }}>
      
      {/* Route Info Badge Overlay */}
      {pickupLocation && dropLocation && (
        <div className="absolute top-3 right-3 z-[400] bg-white/95 border border-black/10 backdrop-blur-md rounded-lg px-3 py-2 text-xs shadow-md flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-[#e67e22] shadow-sm"></div>
          <div>
            <div className="font-semibold text-zinc-900 text-[11px] truncate max-w-[220px]">
              {originAddress.split(',')[0]} ➔ {destAddress.split(',')[0]}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              Transit: ~{calculatedDistKm} km • ~{calculatedEtaHours} hrs
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
        {showWarehouses && TAMIL_NADU_WAREHOUSES.map((wh) => {
          const colors = getHubColors(wh.type);
          const capacityPercent = Math.min(100, Math.round((wh.capacityTonnes / 3500) * 100));

          return (
            <Marker 
              key={wh.id} 
              position={[wh.lat, wh.lng]} 
              icon={createWarehouseIcon(wh)}
            >
              {/* Dark Glass Hover Tooltip */}
              <Tooltip 
                direction="top" 
                offset={[0, -10]} 
                opacity={1}
                className="qe-dark-tooltip"
              >
                <div style={{ width: '190px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: '#ffffff' }}>{wh.name}</span>
                    <span style={{ 
                      fontSize: '9px', 
                      padding: '1px 6px', 
                      borderRadius: '4px', 
                      background: colors.main, 
                      color: '#ffffff', 
                      fontWeight: 600 
                    }}>
                      {wh.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
                    {wh.activeFleet} Trucks • {wh.capacityTonnes.toLocaleString()} MT Cap
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${capacityPercent}%`, height: '100%', background: colors.main, borderRadius: '2px' }}></div>
                  </div>
                </div>
              </Tooltip>

              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-1.5 mb-1.5">
                    <span className="text-zinc-900 font-bold text-sm">{wh.name}</span>
                    <span 
                      className="text-[9px] px-2 py-0.5 rounded font-semibold"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {wh.type}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-xs mb-2 leading-tight">{wh.address}</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                    <div>
                      <span className="text-zinc-400 block text-[9px] uppercase font-semibold">Storage Cap</span>
                      <span className="font-bold text-zinc-800">{wh.capacityTonnes} MT</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[9px] uppercase font-semibold">Active Fleet</span>
                      <span className="font-bold text-[#e67e22]">{wh.activeFleet} Heavy Trucks</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-zinc-500">
                    Services: {wh.storageTypes.join(', ')}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Pickup Marker */}
        {pickupLocation && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={createPickupIcon()}>
            <Popup>
              <div className="p-1">
                <div className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-1">
                  ▲ Origin Pickup Hub
                </div>
                <div className="text-zinc-900 font-medium text-xs mt-0.5">{pickupLocation.address || 'Pickup Point'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Drop Marker */}
        {dropLocation && (
          <Marker position={[dropLocation.lat, dropLocation.lng]} icon={createDropIcon()}>
            <Popup>
              <div className="p-1">
                <div className="text-[#e67e22] font-bold text-xs uppercase flex items-center gap-1">
                  ▼ Destination Hub / CFS
                </div>
                <div className="text-zinc-900 font-medium text-xs mt-0.5">{dropLocation.address || 'Dropoff Destination'}</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Active Driver Marker */}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createDriverIcon('busy')}>
            <Popup>
              <div className="p-1">
                <div className="text-[#e67e22] font-bold text-xs uppercase">Assigned Heavy Truck</div>
                <div className="text-zinc-700 text-xs font-mono mt-0.5">
                  GPS: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Animated Dashed Route Lines */}
        {activeRoadPath.length > 0 && (
          <>
            {/* Outer Amber Glow Line */}
            <Polyline 
              positions={activeRoadPath.map(pt => [pt.lat, pt.lng])} 
              color="#f39c12"
              weight={6}
              opacity={0.3}
            />
            {/* Main Animated Dashed Line */}
            <Polyline 
              positions={activeRoadPath.map(pt => [pt.lat, pt.lng])} 
              color="#e67e22"
              weight={3.5}
              opacity={0.9}
              dashArray="8, 6"
            >
              <Tooltip sticky>
                <div className="text-xs font-sans">
                  <div className="font-bold text-zinc-900">
                    {originAddress.split(',')[0]} ➔ {destAddress.split(',')[0]}
                  </div>
                  <div className="text-zinc-500 text-[11px] mt-0.5">
                    🛣️ Highway Transit: ~{calculatedDistKm} km • ~{calculatedEtaHours} hrs
                  </div>
                </div>
              </Tooltip>
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
                  <div className="text-zinc-900 font-bold text-xs">{drv.name}</div>
                  <div className="text-zinc-600 text-[11px] mt-0.5 font-mono">
                    Truck ID: <strong>{drv.driverId}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500 capitalize">Status: {drv.status}</span>
                    <span className="text-emerald-600 font-semibold">Stationed at Hub</span>
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
