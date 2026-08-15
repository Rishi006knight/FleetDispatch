export interface WarehouseLocation {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  address: string;
  capacityTonnes: number;
  activeFleet: number;
  type: 'Port Terminal' | 'Primary Gateway' | 'Industrial Hub' | 'Regional Hub';
  storageTypes: Array<'Ambient' | 'Cold Storage' | 'Pallet Staging' | 'Bonded Yard' | 'Cross-Docking'>;
  dailyStorageRatePerTonne: number;
}

export const TAMIL_NADU_CENTER: [number, number] = [10.8505, 78.7047]; // Centered near Trichy to frame all of TN
export const TAMIL_NADU_DEFAULT_ZOOM = 7;

export const TAMIL_NADU_WAREHOUSES: WarehouseLocation[] = [
  {
    id: 'chennai-port',
    name: 'Chennai Port',
    district: 'Chennai',
    lat: 13.0844,
    lng: 80.2936,
    address: 'Chennai Port Trust Container Terminal & CFS, Rajaji Salai, Chennai',
    capacityTonnes: 3500,
    activeFleet: 52,
    type: 'Port Terminal',
    storageTypes: ['Bonded Yard', 'Cold Storage', 'Pallet Staging', 'Cross-Docking'],
    dailyStorageRatePerTonne: 350
  },
  {
    id: 'ennore-port',
    name: 'Ennore Port (Kamarajar)',
    district: 'Tiruvallur',
    lat: 13.2611,
    lng: 80.3314,
    address: 'Kamarajar Port Container & Bulk Cargo Freight Terminal, Ennore',
    capacityTonnes: 3200,
    activeFleet: 48,
    type: 'Port Terminal',
    storageTypes: ['Bonded Yard', 'Pallet Staging', 'Ambient', 'Cross-Docking'],
    dailyStorageRatePerTonne: 320
  },
  {
    id: 'chennai-koyambedu',
    name: 'Chennai - Koyambedu',
    district: 'Chennai',
    lat: 13.0692,
    lng: 80.1948,
    address: 'Central Wholesale & Freight Terminal, Koyambedu, Chennai',
    capacityTonnes: 2200,
    activeFleet: 45,
    type: 'Primary Gateway',
    storageTypes: ['Cold Storage', 'Ambient', 'Cross-Docking'],
    dailyStorageRatePerTonne: 280
  },
  {
    id: 'chennai-tambaram',
    name: 'Chennai - Tambaram',
    district: 'Chengalpattu',
    lat: 12.9249,
    lng: 80.1000,
    address: 'GST Road South Gateway Logistics Park, Tambaram, Chennai',
    capacityTonnes: 1800,
    activeFleet: 34,
    type: 'Primary Gateway',
    storageTypes: ['Ambient', 'Pallet Staging', 'Cross-Docking'],
    dailyStorageRatePerTonne: 250
  },
  {
    id: 'coimbatore',
    name: 'Coimbatore',
    district: 'Coimbatore',
    lat: 11.0168,
    lng: 76.9558,
    address: 'Peelamedu Industrial Logistics Park, Avinashi Road, Coimbatore',
    capacityTonnes: 2000,
    activeFleet: 38,
    type: 'Industrial Hub',
    storageTypes: ['Ambient', 'Pallet Staging', 'Cross-Docking'],
    dailyStorageRatePerTonne: 260
  },
  {
    id: 'madurai',
    name: 'Madurai',
    district: 'Madurai',
    lat: 9.9252,
    lng: 78.1198,
    address: 'Kappalur Ring Road Logistics Terminal, Madurai',
    capacityTonnes: 1400,
    activeFleet: 26,
    type: 'Regional Hub',
    storageTypes: ['Ambient', 'Cold Storage', 'Pallet Staging'],
    dailyStorageRatePerTonne: 230
  },
  {
    id: 'trichy',
    name: 'Trichy (Tiruchirappalli)',
    district: 'Tiruchirappalli',
    lat: 10.7905,
    lng: 78.7047,
    address: 'Thuvakudi Central Transit Corridor, Trichy',
    capacityTonnes: 1600,
    activeFleet: 30,
    type: 'Regional Hub',
    storageTypes: ['Ambient', 'Cross-Docking', 'Pallet Staging'],
    dailyStorageRatePerTonne: 220
  },
  {
    id: 'salem',
    name: 'Salem',
    district: 'Salem',
    lat: 11.6643,
    lng: 78.1460,
    address: 'Steel Plant Road Logistics Center, Salem',
    capacityTonnes: 1300,
    activeFleet: 24,
    type: 'Industrial Hub',
    storageTypes: ['Ambient', 'Pallet Staging'],
    dailyStorageRatePerTonne: 240
  },
  {
    id: 'tirunelveli',
    name: 'Tirunelveli',
    district: 'Tirunelveli',
    lat: 8.7139,
    lng: 77.7567,
    address: 'SIPCOT Industrial Growth Center, Gangaikondan, Tirunelveli',
    capacityTonnes: 1100,
    activeFleet: 18,
    type: 'Regional Hub',
    storageTypes: ['Ambient', 'Cold Storage'],
    dailyStorageRatePerTonne: 210
  },
  {
    id: 'vellore',
    name: 'Vellore',
    district: 'Vellore',
    lat: 12.9165,
    lng: 79.1325,
    address: 'Ranipet-Vellore Industrial Logistics Park, NH-48, Vellore',
    capacityTonnes: 1250,
    activeFleet: 22,
    type: 'Industrial Hub',
    storageTypes: ['Ambient', 'Pallet Staging', 'Cross-Docking'],
    dailyStorageRatePerTonne: 230
  },
  {
    id: 'tiruppur',
    name: 'Tiruppur',
    district: 'Tiruppur',
    lat: 11.1085,
    lng: 77.3411,
    address: 'Netaji Apparel Park Freight Terminal, Avinashi, Tiruppur',
    capacityTonnes: 1450,
    activeFleet: 29,
    type: 'Industrial Hub',
    storageTypes: ['Ambient', 'Pallet Staging', 'Bonded Yard'],
    dailyStorageRatePerTonne: 260
  },
  {
    id: 'erode',
    name: 'Erode',
    district: 'Erode',
    lat: 11.3410,
    lng: 77.7172,
    address: 'Perundurai SIPCOT Logistics Complex, Erode',
    capacityTonnes: 1200,
    activeFleet: 20,
    type: 'Industrial Hub',
    storageTypes: ['Ambient', 'Cold Storage', 'Cross-Docking'],
    dailyStorageRatePerTonne: 230
  },
  {
    id: 'thoothukudi',
    name: 'Thoothukudi',
    district: 'Thoothukudi',
    lat: 8.7642,
    lng: 78.1348,
    address: 'V.O. Chidambaranar Port Container & Freight Station, Thoothukudi',
    capacityTonnes: 2800,
    activeFleet: 42,
    type: 'Port Terminal',
    storageTypes: ['Bonded Yard', 'Cold Storage', 'Pallet Staging', 'Cross-Docking'],
    dailyStorageRatePerTonne: 340
  },
  {
    id: 'thanjavur',
    name: 'Thanjavur',
    district: 'Thanjavur',
    lat: 10.7870,
    lng: 79.1378,
    address: 'Pillaiyarpatti Delta Logistics Terminal, Thanjavur',
    capacityTonnes: 950,
    activeFleet: 16,
    type: 'Regional Hub',
    storageTypes: ['Ambient', 'Cold Storage'],
    dailyStorageRatePerTonne: 200
  },
  {
    id: 'hosur',
    name: 'Hosur',
    district: 'Krishnagiri',
    lat: 12.7409,
    lng: 77.8253,
    address: 'SIPCOT Phase-II Auto & Electronics Freight Hub, Hosur',
    capacityTonnes: 2100,
    activeFleet: 36,
    type: 'Industrial Hub',
    storageTypes: ['Ambient', 'Pallet Staging', 'Cross-Docking'],
    dailyStorageRatePerTonne: 270
  },
  {
    id: 'nagercoil',
    name: 'Nagercoil',
    district: 'Kanyakumari',
    lat: 8.1833,
    lng: 77.4119,
    address: 'Kanyakumari Highway Gateway Depot, Nagercoil',
    capacityTonnes: 850,
    activeFleet: 14,
    type: 'Regional Hub',
    storageTypes: ['Ambient', 'Cold Storage'],
    dailyStorageRatePerTonne: 210
  }
];

export const TAMIL_NADU_PRESET_ROUTES = [
  {
    name: 'Chennai Port CFS -> Hosur SIPCOT Industrial Corridor',
    pickup: { lat: 13.0844, lng: 80.2936, address: 'Chennai Port Trust Container Terminal, Rajaji Salai, Chennai' },
    drop: { lat: 12.7409, lng: 77.8253, address: 'SIPCOT Phase-II Auto & Electronics Freight Hub, Hosur' }
  },
  {
    name: 'Ennore Port Bulk Terminal -> Vellore Logistics Park',
    pickup: { lat: 13.2611, lng: 80.3314, address: 'Kamarajar Port Container & Bulk Cargo Freight Terminal, Ennore' },
    drop: { lat: 12.9165, lng: 79.1325, address: 'Ranipet-Vellore Industrial Logistics Park, Vellore' }
  },
  {
    name: 'Chennai: Koyambedu Wholesale -> Tambaram Gateway',
    pickup: { lat: 13.0692, lng: 80.1948, address: 'Central Wholesale & Freight Terminal, Koyambedu, Chennai' },
    drop: { lat: 12.9249, lng: 80.1000, address: 'GST Road South Gateway Logistics Park, Tambaram, Chennai' }
  },
  {
    name: 'Coimbatore Industrial -> Tiruppur Apparel Export Hub',
    pickup: { lat: 11.0168, lng: 76.9558, address: 'Peelamedu Industrial Logistics Park, Coimbatore' },
    drop: { lat: 11.1085, lng: 77.3411, address: 'Netaji Apparel Park Freight Terminal, Tiruppur' }
  },
  {
    name: 'Salem Steel City -> Erode SIPCOT Complex',
    pickup: { lat: 11.6643, lng: 78.1460, address: 'Steel Plant Road Logistics Center, Salem' },
    drop: { lat: 11.3410, lng: 77.7172, address: 'Perundurai SIPCOT Logistics Complex, Erode' }
  },
  {
    name: 'Trichy Central Hub -> Thanjavur Delta Terminal',
    pickup: { lat: 10.7905, lng: 78.7047, address: 'Thuvakudi Central Transit Corridor, Trichy' },
    drop: { lat: 10.7870, lng: 79.1378, address: 'Pillaiyarpatti Delta Logistics Terminal, Thanjavur' }
  },
  {
    name: 'Madurai Ring Road -> Tirunelveli SIPCOT Hub',
    pickup: { lat: 9.9252, lng: 78.1198, address: 'Kappalur Ring Road Logistics Terminal, Madurai' },
    drop: { lat: 8.7139, lng: 77.7567, address: 'SIPCOT Industrial Growth Center, Gangaikondan, Tirunelveli' }
  },
  {
    name: 'Thoothukudi Port VOC -> Nagercoil Terminal',
    pickup: { lat: 8.7642, lng: 78.1348, address: 'V.O. Chidambaranar Port Container & Freight Station, Thoothukudi' },
    drop: { lat: 8.1833, lng: 77.4119, address: 'Kanyakumari Highway Gateway Depot, Nagercoil' }
  }
];
