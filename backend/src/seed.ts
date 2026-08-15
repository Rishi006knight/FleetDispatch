import Driver from './models/Driver.js';
import Order from './models/Order.js';
import Incident from './models/Incident.js';

export const INITIAL_TAMIL_NADU_DRIVERS = [
  {
    driverId: 'TRK-01-1001',
    name: 'Murugan',
    phone: '9840112201',
    vehicleId: 'TN-01-TR-1001',
    vehicleType: '40ft Container Freightliner',
    status: 'online',
    currentLocation: { lat: 13.0844, lng: 80.2936 },
    stationHub: 'Rajaji Salai, Chennai Port CFS',
    rtoCode: '01',
    rating: 4.94,
    reliability: 0.99,
    earnings: 52400,
    completedDeliveries: 72
  },
  {
    driverId: 'TRK-02-1001',
    name: 'Shanmugam',
    phone: '9840112202',
    vehicleId: 'TN-02-TR-1001',
    vehicleType: '40ft Container Freightliner',
    status: 'online',
    currentLocation: { lat: 13.2611, lng: 80.3314 },
    stationHub: 'Kamarajar Port Freight Terminal, Ennore',
    rtoCode: '02',
    rating: 4.91,
    reliability: 0.98,
    earnings: 46800,
    completedDeliveries: 58
  },
  {
    driverId: 'TRK-04-1001',
    name: 'Ganesan',
    phone: '9840112204',
    vehicleId: 'TN-04-TR-1001',
    vehicleType: '20ft Multi-Axle Truck',
    status: 'online',
    currentLocation: { lat: 13.0692, lng: 80.1948 },
    stationHub: 'Wholesale Market Freight Bay, Koyambedu',
    rtoCode: '04',
    rating: 4.88,
    reliability: 0.97,
    earnings: 39500,
    completedDeliveries: 52
  },
  {
    driverId: 'TRK-22-1001',
    name: 'Mani',
    phone: '9840112222',
    vehicleId: 'TN-22-TR-1001',
    vehicleType: '14ft Eicher Container',
    status: 'online',
    currentLocation: { lat: 12.9249, lng: 80.1000 },
    stationHub: 'GST Road South Gateway, Tambaram',
    rtoCode: '22',
    rating: 4.89,
    reliability: 0.98,
    earnings: 41200,
    completedDeliveries: 49
  },
  {
    driverId: 'TRK-38-1001',
    name: 'Senthil Kumar',
    phone: '9840112238',
    vehicleId: 'TN-38-TR-1001',
    vehicleType: '32ft Heavy Trailer',
    status: 'online',
    currentLocation: { lat: 11.0168, lng: 76.9558 },
    stationHub: 'Peelamedu Industrial Park, Coimbatore',
    rtoCode: '38',
    rating: 4.96,
    reliability: 0.99,
    earnings: 58200,
    completedDeliveries: 84
  },
  {
    driverId: 'TRK-58-1001',
    name: 'Arumugam',
    phone: '9840112258',
    vehicleId: 'TN-58-TR-1001',
    vehicleType: '32ft Heavy Trailer',
    status: 'online',
    currentLocation: { lat: 9.9252, lng: 78.1198 },
    stationHub: 'Kappalur Ring Road Terminal, Madurai',
    rtoCode: '58',
    rating: 4.90,
    reliability: 0.98,
    earnings: 47600,
    completedDeliveries: 61
  },
  {
    driverId: 'TRK-45-1001',
    name: 'Ramasamy',
    phone: '9840112245',
    vehicleId: 'TN-45-TR-1001',
    vehicleType: '32ft Heavy Trailer',
    status: 'online',
    currentLocation: { lat: 10.7905, lng: 78.7047 },
    stationHub: 'Thuvakudi Central Transit Corridor, Trichy',
    rtoCode: '45',
    rating: 4.93,
    reliability: 0.98,
    earnings: 51000,
    completedDeliveries: 69
  },
  {
    driverId: 'TRK-27-1001',
    name: 'Karthik Raja',
    phone: '9840112227',
    vehicleId: 'TN-27-TR-1001',
    vehicleType: '20ft Multi-Axle Truck',
    status: 'online',
    currentLocation: { lat: 11.6643, lng: 78.1460 },
    stationHub: 'Steel Plant Road Logistics Center, Salem',
    rtoCode: '27',
    rating: 4.87,
    reliability: 0.96,
    earnings: 38400,
    completedDeliveries: 46
  },
  {
    driverId: 'TRK-72-1001',
    name: 'Muthu',
    phone: '9840112272',
    vehicleId: 'TN-72-TR-1001',
    vehicleType: '32ft Heavy Trailer',
    status: 'online',
    currentLocation: { lat: 8.7139, lng: 77.7567 },
    stationHub: 'Gangaikondan SIPCOT, Tirunelveli',
    rtoCode: '72',
    rating: 4.92,
    reliability: 0.97,
    earnings: 44300,
    completedDeliveries: 55
  },
  {
    driverId: 'TRK-23-1001',
    name: 'Perumal',
    phone: '9840112223',
    vehicleId: 'TN-23-TR-1001',
    vehicleType: '32ft Heavy Trailer',
    status: 'online',
    currentLocation: { lat: 12.9165, lng: 79.1325 },
    stationHub: 'Ranipet SIPCOT Logistics Park, Vellore',
    rtoCode: '23',
    rating: 4.89,
    reliability: 0.98,
    earnings: 42100,
    completedDeliveries: 53
  },
  {
    driverId: 'TRK-39-1001',
    name: 'Sakthivel',
    phone: '9840112239',
    vehicleId: 'TN-39-TR-1001',
    vehicleType: '20ft Multi-Axle Truck',
    status: 'online',
    currentLocation: { lat: 11.1085, lng: 77.3411 },
    stationHub: 'Netaji Apparel Park Terminal, Tiruppur',
    rtoCode: '39',
    rating: 4.95,
    reliability: 0.99,
    earnings: 53800,
    completedDeliveries: 76
  },
  {
    driverId: 'TRK-33-1001',
    name: 'Palanisamy',
    phone: '9840112233',
    vehicleId: 'TN-33-TR-1001',
    vehicleType: 'Refrigerated Reefer Truck',
    status: 'online',
    currentLocation: { lat: 11.3410, lng: 77.7172 },
    stationHub: 'Perundurai SIPCOT Complex, Erode',
    rtoCode: '33',
    rating: 4.91,
    reliability: 0.98,
    earnings: 49200,
    completedDeliveries: 62
  },
  {
    driverId: 'TRK-69-1001',
    name: 'Velu Pandian',
    phone: '9840112269',
    vehicleId: 'TN-69-TR-1001',
    vehicleType: '40ft Container Freightliner',
    status: 'online',
    currentLocation: { lat: 8.7642, lng: 78.1348 },
    stationHub: 'V.O.C Port Container Freight Station, Thoothukudi',
    rtoCode: '69',
    rating: 4.96,
    reliability: 0.99,
    earnings: 59700,
    completedDeliveries: 81
  },
  {
    driverId: 'TRK-49-1001',
    name: 'Manickam',
    phone: '9840112249',
    vehicleId: 'TN-49-TR-1001',
    vehicleType: '20ft Multi-Axle Truck',
    status: 'online',
    currentLocation: { lat: 10.7870, lng: 79.1378 },
    stationHub: 'Pillaiyarpatti Delta Terminal, Thanjavur',
    rtoCode: '49',
    rating: 4.88,
    reliability: 0.97,
    earnings: 37900,
    completedDeliveries: 44
  },
  {
    driverId: 'TRK-70-1001',
    name: 'Dhandapani',
    phone: '9840112270',
    vehicleId: 'TN-70-TR-1001',
    vehicleType: '32ft Heavy Trailer',
    status: 'online',
    currentLocation: { lat: 12.7409, lng: 77.8253 },
    stationHub: 'SIPCOT Phase-II Auto Freight Hub, Hosur',
    rtoCode: '70',
    rating: 4.94,
    reliability: 0.99,
    earnings: 56300,
    completedDeliveries: 79
  },
  {
    driverId: 'TRK-74-1001',
    name: 'Vijayakumar',
    phone: '9840112274',
    vehicleId: 'TN-74-TR-1001',
    vehicleType: '20ft Multi-Axle Truck',
    status: 'online',
    currentLocation: { lat: 8.1833, lng: 77.4119 },
    stationHub: 'Kanyakumari Highway Gateway Depot, Nagercoil',
    rtoCode: '74',
    rating: 4.87,
    reliability: 0.96,
    earnings: 36500,
    completedDeliveries: 42
  }
];

export const INITIAL_SAMPLE_ORDERS = [
  {
    orderId: 'QE-849201',
    customerName: 'ABC Global Logistics & Freight Ltd',
    customerPhone: '9840123456',
    businessCode: 'ABC123',
    pickup: {
      lat: 13.0844,
      lng: 80.2936,
      address: 'Chennai Port Trust Container Terminal, Rajaji Salai, Chennai'
    },
    drop: {
      lat: 12.7409,
      lng: 77.8253,
      address: 'SIPCOT Phase-II Auto & Electronics Freight Hub, Hosur'
    },
    packageDetails: {
      weight: 18500,
      type: 'Automotive Assemblies & EV Batteries',
      priority: 'high'
    },
    warehouseServices: {
      facilityId: 'chennai-port',
      storageType: 'Bonded Yard',
      days: 2,
      handlingRequired: true
    },
    price: 24500,
    totalBillAmount: 24500,
    itemizedBill: {
      freightBase: 18500,
      storageFee: 1800,
      handlingFee: 1250,
      tollSurcharge: 2950,
      notes: 'GST-4 Corridor transit toll, port crane staging, and customs yard clearance included.'
    },
    status: 'bill_presented',
    driverId: null,
    eta: 240,
    routeCoordinates: [
      { lat: 13.0844, lng: 80.2936 },
      { lat: 12.7409, lng: 77.8253 }
    ]
  },
  {
    orderId: 'QE-791044',
    customerName: 'Kovai Industrial Components Ltd',
    customerPhone: '9840123456',
    businessCode: 'KVI101',
    pickup: {
      lat: 11.0168,
      lng: 76.9558,
      address: 'Peelamedu Industrial Logistics Park, Avinashi Road, Coimbatore'
    },
    drop: {
      lat: 11.1085,
      lng: 77.3411,
      address: 'Netaji Apparel Park Freight Terminal, Avinashi, Tiruppur'
    },
    packageDetails: {
      weight: 12000,
      type: 'Textiles & Garment Bales',
      priority: 'medium'
    },
    warehouseServices: {
      facilityId: 'coimbatore',
      storageType: 'Pallet Staging',
      days: 1,
      handlingRequired: true
    },
    price: 14200,
    totalBillAmount: 14200,
    itemizedBill: {
      freightBase: 11000,
      storageFee: 800,
      handlingFee: 1250,
      tollSurcharge: 1150,
      notes: 'Avinashi expressway transit and pallet staging.'
    },
    status: 'ready_for_dispatch',
    driverId: null,
    eta: 65,
    routeCoordinates: [
      { lat: 11.0168, lng: 76.9558 },
      { lat: 11.1085, lng: 77.3411 }
    ]
  },
  {
    orderId: 'QE-652390',
    customerName: 'Chennai Port Container Exporters',
    customerPhone: '9840123456',
    businessCode: 'CHE001',
    pickup: {
      lat: 13.2611,
      lng: 80.3314,
      address: 'Kamarajar Port Container & Bulk Cargo Terminal, Ennore'
    },
    drop: {
      lat: 12.9165,
      lng: 79.1325,
      address: 'Ranipet-Vellore Industrial Logistics Park, NH-48, Vellore'
    },
    packageDetails: {
      weight: 24000,
      type: 'Heavy Machinery & Industrial Equipment',
      priority: 'high'
    },
    warehouseServices: {
      facilityId: 'ennore-port',
      storageType: 'Bonded Yard',
      days: 3,
      handlingRequired: true
    },
    price: 28500,
    totalBillAmount: 28500,
    itemizedBill: {
      freightBase: 21500,
      storageFee: 2400,
      handlingFee: 1250,
      tollSurcharge: 3350,
      notes: 'NH-48 Heavy Multi-Axle freight and mechanized ramp.'
    },
    status: 'completed',
    driverId: 'TRK-02-1001',
    driverName: 'Shanmugam (Ennore Port)',
    vehicleId: 'TN-02-TR-1001',
    eta: 190,
    routeCoordinates: [
      { lat: 13.2611, lng: 80.3314 },
      { lat: 12.9165, lng: 79.1325 }
    ]
  }
];

export async function seedDatabase() {
  try {
    const driverCount = await Driver.countDocuments();
    if (driverCount === 0) {
      console.log('⚡ Seeding initial 16 Tamil Nadu stationed heavy truck fleet drivers...');
      await Driver.insertMany(INITIAL_TAMIL_NADU_DRIVERS);
      console.log('✓ Successfully seeded 16 Tamil Nadu station hub drivers.');
    }

    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      console.log('⚡ Seeding initial B2B freight consignments and quotation bills...');
      await Order.insertMany(INITIAL_SAMPLE_ORDERS);
      console.log('✓ Successfully seeded initial B2B orders.');
    }
  } catch (err) {
    console.error('Error seeding initial logistics data:', err);
  }
}
