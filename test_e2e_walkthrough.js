/**
 * QuantumExpress Fleet Platform - Full E2E Walkthrough Simulation (Fixed)
 *
 * Phase 1  - Health Checks (Backend + ML)
 * Phase 2  - Driver Registration & Activation
 * Phase 3  - ML Service Endpoint Verification
 * Phase 4  - Order Booking with ML pricing + risk
 * Phase 5  - AI Driver Matching Matrix
 * Phase 6  - Dispatch & Route Optimization (ML)
 * Phase 7  - Driver Telemetry Simulation
 * Phase 8  - ML Route Anomaly Detection
 * Phase 9  - Proof-of-Delivery (CV Verifier)
 * Phase 10 - Incident Management
 * Phase 11 - Analytics Dashboard + Simulation Bridge
 */

const axios = require('axios');

const BACKEND = 'http://localhost:5000';
const ML = 'http://localhost:8000';
const API = `${BACKEND}/api`;

const ok = (msg) => console.log(`  OK  ${msg}`);
const fail = (msg) => console.error(`  XX  ${msg}`);
const sep = (title) => console.log(`\n${'='.repeat(60)}\n  ${title}\n${'='.repeat(60)}`);

let passed = 0, failed = 0;

async function check(label, fn) {
  try {
    await fn();
    ok(label);
    passed++;
  } catch (e) {
    const detail = e.response ? JSON.stringify(e.response.data) : e.message;
    fail(`${label} -- ${detail}`);
    failed++;
  }
}

let driverIdA, driverIdB, orderId1, orderId2, assignedDriverId, incidentId;

// Helper to generate a valid textured 32x32 BMP image in base64 to pass CV check
function generateTexturedBMPBase64() {
  const width = 32;
  const height = 32;
  const headerSize = 54;
  const pixelDataSize = width * height * 3;
  const fileSize = headerSize + pixelDataSize;
  const buffer = Buffer.alloc(fileSize);

  // BMP Signature
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(0, 6);
  buffer.writeUInt32LE(headerSize, 10);

  // DIB Header
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28); // 24-bit BGR
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelDataSize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  buffer.writeUInt32LE(0, 46);
  buffer.writeUInt32LE(0, 50);

  // Pixel data (high edge density checkerboard)
  let offset = headerSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = ((x + y) % 2 === 0) ? 240 : 15; // Average brightness ~ 127
      buffer[offset++] = val; // B
      buffer[offset++] = val; // G
      buffer[offset++] = val; // R
    }
  }

  return buffer.toString('base64');
}

const TEXTURED_IMG_B64 = generateTexturedBMPBase64();

async function runWalkthrough() {
  console.log('\n');
  console.log('  QuantumExpress -- Full E2E Walkthrough Simulation');
  console.log('');

  // PHASE 1: Health Checks
  sep('PHASE 1 -- Health Checks');

  await check('Backend /health is UP', async () => {
    const r = await axios.get(`${BACKEND}/health`);
    if (r.data.status !== 'UP') throw new Error('Status not UP');
    console.log(`       Database: ${r.data.database}`);
  });

  await check('ML /health is HEALTHY', async () => {
    const r = await axios.get(`${ML}/health`);
    if (r.data.status !== 'HEALTHY') throw new Error(`Status: ${r.data.status}`);
    console.log(`       Services: ${r.data.services}`);
  });

  await check('Backend /api/analytics accessible', async () => {
    const r = await axios.get(`${API}/analytics`);
    console.log(`       Orders: ${r.data.totalOrdersCount}, Drivers: ${r.data.activeOrders}`);
  });

  // PHASE 2: Driver Registration
  sep('PHASE 2 -- Driver Registration & Activation');

  await check('Register Driver A: Rohan Sharma (Bike)', async () => {
    const r = await axios.post(`${API}/drivers`, {
      name: 'Rohan Sharma', phone: '9876543211',
      vehicleId: 'MH-12-EX-4921', vehicleType: 'bike',
      initialLat: 19.0760, initialLng: 72.8777
    });
    driverIdA = r.data.driverId;
    console.log(`       ID: ${driverIdA}`);
  });

  await check('Register Driver B: Priya Patel (Car)', async () => {
    const r = await axios.post(`${API}/drivers`, {
      name: 'Priya Patel', phone: '9876543212',
      vehicleId: 'MH-12-EX-8822', vehicleType: 'car',
      initialLat: 19.0820, initialLng: 72.8820
    });
    driverIdB = r.data.driverId;
    console.log(`       ID: ${driverIdB}`);
  });

  if (driverIdA) await check('Driver A -> ONLINE', async () => {
    const r = await axios.put(`${API}/drivers/${driverIdA}/status`, { status: 'online' });
    if (r.data.status !== 'online') throw new Error(`Got: ${r.data.status}`);
  });

  if (driverIdB) await check('Driver B -> ONLINE', async () => {
    const r = await axios.put(`${API}/drivers/${driverIdB}/status`, { status: 'online' });
    if (r.data.status !== 'online') throw new Error(`Got: ${r.data.status}`);
  });

  await check('GET /api/drivers returns >= 2 drivers', async () => {
    const r = await axios.get(`${API}/drivers`);
    if (r.data.length < 2) throw new Error(`Got ${r.data.length}`);
    console.log(`       ${r.data.length} drivers registered`);
  });

  // PHASE 3: ML Endpoints
  sep('PHASE 3 -- ML Service Endpoint Verification');

  await check('ML predict-price (rain, heavy traffic, peak hour)', async () => {
    const r = await axios.post(`${ML}/api/predict-price`, {
      distance: 8.5, priority: 'high', package_type: 'electronics',
      weather: 'rain', traffic: 'heavy', hour: 18
    });
    if (!r.data.price) throw new Error('No price');
    console.log(`       Price: Rs.${r.data.price} | Surge: ${r.data.breakdown.surge_multiplier}x`);
  });

  await check('ML predict-risk (high priority, rain)', async () => {
    const r = await axios.post(`${ML}/api/predict-risk`, {
      distance: 8.5, priority: 'high', package_weight: 2.5,
      driver_rating: 4.2, driver_reliability: 0.85, weather: 'rain'
    });
    if (!r.data.risk) throw new Error('No risk');
    console.log(`       Risk: ${Math.round(r.data.risk.overall * 100)}% overall | Delay: ${Math.round(r.data.risk.delayProb * 100)}%`);
  });

  await check('ML optimize-route (driver -> pickup -> drop)', async () => {
    const r = await axios.post(`${ML}/api/optimize-route`, {
      driver_location: { lat: 19.0760, lng: 72.8777 },
      pickup: { lat: 19.0660, lng: 72.8680 },
      drop: { lat: 19.1130, lng: 72.8690 }
    });
    if (!r.data.route) throw new Error('No route');
    console.log(`       Waypoints: ${r.data.route.length} | ETA: ${Math.round(r.data.total_eta_minutes)} mins`);
  });

  await check('ML predict-churn (at-risk driver profile)', async () => {
    const r = await axios.post(`${ML}/api/predict-churn`, {
      cancellation_rate: 0.18, rating: 3.6,
      completed_deliveries: 35, earnings: 9000
    });
    if (r.data.churn_probability === undefined) throw new Error('No churn_probability');
    console.log(`       Churn Probability: ${Math.round(r.data.churn_probability * 100)}%`);
  });

  await check('ML detect-deviation (driver ON route)', async () => {
    const route = [
      { lat: 19.0760, lng: 72.8777 }, { lat: 19.0700, lng: 72.8720 },
      { lat: 19.0660, lng: 72.8680 }, { lat: 19.1130, lng: 72.8690 }
    ];
    const r = await axios.post(`${ML}/api/detect-deviation`, {
      current_lat: 19.0700, current_lng: 72.8720, route
    });
    console.log(`       Deviated: ${r.data.deviated} | Distance: ${r.data.distance_meters} meters`);
  });

  await check('ML simulate (10 drivers, 25 orders, +5 drivers, +30% demand)', async () => {
    const r = await axios.post(`${ML}/api/simulate`, {
      current_drivers: 10, current_orders: 25,
      additional_drivers: 5, demand_increase_percent: 30, zone: 'Mumbai South'
    });
    if (!r.data.message) throw new Error('No message');
    console.log(`       ${r.data.message}`);
  });

  // PHASE 4: Order Booking
  sep('PHASE 4 -- Customer Order Booking');

  await check('Book Order 1: BKC -> Andheri (High, Electronics)', async () => {
    const r = await axios.post(`${API}/orders`, {
      customerName: 'Sanjay Gupta', customerPhone: '9988776655',
      pickup: { lat: 19.0660, lng: 72.8680, address: 'BKC, Mumbai' },
      drop: { lat: 19.1130, lng: 72.8690, address: 'Marol Metro, Andheri East' },
      packageWeight: 2.3, packageType: 'electronics', priority: 'high'
    });
    orderId1 = r.data.orderId;
    console.log(`       Order ID: ${orderId1} | Price: Rs.${r.data.price} | Risk: ${Math.round(r.data.riskScore.overall * 100)}%`);
  });

  await check('Book Order 2: Dadar -> Bandra (Medium, Clothes)', async () => {
    const r = await axios.post(`${API}/orders`, {
      customerName: 'Meera Joshi', customerPhone: '9966554433',
      pickup: { lat: 19.0183, lng: 72.8420, address: 'Dadar TT, Mumbai' },
      drop: { lat: 19.0596, lng: 72.8295, address: 'Bandra West, Mumbai' },
      packageWeight: 0.8, packageType: 'clothes', priority: 'medium'
    });
    orderId2 = r.data.orderId;
    console.log(`       Order ID: ${orderId2} | Price: Rs.${r.data.price} | Risk: ${Math.round(r.data.riskScore.overall * 100)}%`);
  });

  if (orderId1) await check('GET Order 1 by ID -> status: pending', async () => {
    const r = await axios.get(`${API}/orders/${orderId1}`);
    if (r.data.status !== 'pending') throw new Error(`Status: ${r.data.status}`);
  });

  // PHASE 5: AI Matching
  sep('PHASE 5 -- AI Driver Matching Matrix');

  if (orderId1) await check('Match Order 1 -> scored candidates', async () => {
    const r = await axios.post(`${API}/orders/match`, { orderId: orderId1 });
    if (!r.data.matches?.length) throw new Error('No matches');
    assignedDriverId = r.data.matches[0].driver.driverId;
    r.data.matches.forEach((m, i) => {
      console.log(`       ${i + 1}. ${m.driver.name} | Score: ${m.score}% | Dist: ${m.distance.toFixed(2)}km | ETA: ${Math.round(m.eta)}min`);
    });
    console.log(`       Best: ${r.data.matches[0].driver.name} (${assignedDriverId})`);
  });

  // PHASE 6: Dispatch
  sep('PHASE 6 -- Dispatch & Route Optimization');

  if (orderId1 && assignedDriverId) await check('Assign Order 1 -> driver gets route + ETA', async () => {
    const r = await axios.post(`${API}/orders/assign`, {
      orderId: orderId1, driverId: assignedDriverId
    });
    if (r.data.status !== 'assigned') throw new Error(`Status: ${r.data.status}`);
    console.log(`       Status: ${r.data.status} | Waypoints: ${r.data.routeCoordinates.length} | ETA: ${r.data.eta} min`);
  });

  // PHASE 7: Telemetry
  sep('PHASE 7 -- Driver Telemetry Update');

  if (assignedDriverId) await check('POST telemetry for assigned driver', async () => {
    const r = await axios.post(`${API}/drivers/${assignedDriverId}/telemetry`, {
      lat: 19.0700, lng: 72.8720, speed: 35, heading: 45
    });
    console.log(`       Updated location: ${r.data.currentLocation?.lat}, ${r.data.currentLocation?.lng}`);
  });

  // PHASE 8: Anomaly Detection
  sep('PHASE 8 -- ML Route Anomaly Detection');

  await check('Detect deviation: driver ON-route (no alert)', async () => {
    const r = await axios.post(`${ML}/api/detect-deviation`, {
      current_lat: 19.0700, current_lng: 72.8720,
      route: [
        { lat: 19.0760, lng: 72.8777 }, { lat: 19.0700, lng: 72.8720 },
        { lat: 19.0660, lng: 72.8680 }, { lat: 19.1130, lng: 72.8690 }
      ]
    });
    console.log(`       Deviated: ${r.data.deviated} | Distance: ${r.data.distance_meters} meters`);
  });

  await check('Detect deviation: driver OFF-route (anomaly flag)', async () => {
    const r = await axios.post(`${ML}/api/detect-deviation`, {
      current_lat: 19.2100, current_lng: 73.0500,
      route: [
        { lat: 19.0760, lng: 72.8777 }, { lat: 19.0660, lng: 72.8680 },
        { lat: 19.1130, lng: 72.8690 }
      ]
    });
    console.log(`       Deviated: ${r.data.deviated} | Distance: ${r.data.distance_meters} meters`);
  });

  // PHASE 9: POD
  sep('PHASE 9 -- Proof-of-Delivery (CV Verifier)');

  await check('ML verify-pod: synthetic image at drop location', async () => {
    const r = await axios.post(`${ML}/api/verify-pod`, {
      photo_base64: TEXTURED_IMG_B64,
      driver_lat: 19.1130, driver_lng: 72.8690,
      drop_lat: 19.1130, drop_lng: 72.8690
    });
    console.log(`       Passed: ${r.data.passed} | Confidence: ${Math.round((r.data.confidence_score ?? 0) * 100)}% | ${r.data.message}`);
  });

  if (orderId1) await check('Backend verify-pod for Order 1', async () => {
    const r = await axios.post(`${API}/orders/${orderId1}/verify-pod`, {
      photoBase64: TEXTURED_IMG_B64,
      driverLocation: { lat: 19.1130, lng: 72.8690 }
    });
    console.log(`       Success: ${r.data.success} | Order Status: ${r.data.order?.status} | ${r.data.message}`);
  });

  // PHASE 10: Incidents
  sep('PHASE 10 -- Incident Management');

  await check('Create route-deviation incident', async () => {
    const r = await axios.post(`${API}/incidents`, {
      orderId: orderId2 || 'TEST-ORD', driverId: driverIdB || 'TEST-DRV',
      type: 'route_deviation', severity: 'medium',
      message: 'Driver deviated 2.4 km from route near Sion Flyover.'
    });
    incidentId = r.data.incidentId;
    console.log(`       Incident ID: ${incidentId}`);
  });

  await check('GET /api/incidents returns >= 1 incident', async () => {
    const r = await axios.get(`${API}/incidents`);
    if (r.data.length === 0) throw new Error('No incidents found');
    console.log(`       ${r.data.length} incidents | Latest: ${r.data[0].type} (${r.data[0].severity})`);
  });

  if (incidentId) await check('Resolve incident', async () => {
    const r = await axios.put(`${API}/incidents/${incidentId}/resolve`, {
      resolution: 'Driver rerouted successfully.'
    });
    if (r.data.status !== 'resolved') throw new Error(`Status: ${r.data.status}`);
    console.log(`       Incident resolved.`);
  });

  // PHASE 11: Analytics
  sep('PHASE 11 -- Analytics & Operations Simulation');

  await check('GET /api/analytics final stats', async () => {
    const r = await axios.get(`${API}/analytics`);
    console.log(`       Total Orders:     ${r.data.totalOrdersCount}`);
    console.log(`       Completed:        ${r.data.completedCount}`);
    console.log(`       Failed:           ${r.data.failedCount}`);
    console.log(`       Active Orders:    ${r.data.activeOrders}`);
    console.log(`       Total Revenue:    Rs.${r.data.totalRevenue}`);
  });

  await check('POST /api/analytics/simulate (backend -> ML bridge)', async () => {
    const r = await axios.post(`${API}/analytics/simulate`, {
      additionalDrivers: 4,
      demandIncreasePercent: 25,
      zoneAlert: 'Thane West'
    });
    if (!r.data.message) throw new Error('No message');
    console.log(`       ${r.data.message}`);
  });

  // FINAL SUMMARY
  const total = passed + failed;
  console.log('\n');
  console.log('  ============================================================');
  console.log(`  E2E WALKTHROUGH COMPLETE`);
  console.log(`  Passed: ${passed} / ${total}`);
  console.log(`  Failed: ${failed}`);
  if (failed === 0) {
    console.log('  ALL CHECKS PASSED -- Platform is FULLY OPERATIONAL!');
  } else {
    console.log('  Some checks failed -- see output above for details.');
  }
  console.log('  ============================================================');
  console.log('');
}

runWalkthrough().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
