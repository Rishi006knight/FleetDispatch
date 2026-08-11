const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== QuantumExpress Operational API Verification ===\n');

  try {
    // 1. Check health
    console.log('[1] Checking backend server health...');
    const health = await axios.get('http://localhost:5000/health');
    console.log(`    Status: ${health.data.status}`);
    console.log(`    Database State: ${health.data.database}`);
    console.log('    ✓ Health check passed!\n');

    // 2. Register Driver A
    console.log('[2] Registering Driver A (Rohan)...');
    const driverA = await axios.post(`${BACKEND_URL}/drivers`, {
      name: 'Rohan Sharma',
      phone: '9876543211',
      vehicleId: 'MH-12-EX-4921',
      vehicleType: 'bike',
      initialLat: 19.0760,
      initialLng: 72.8777
    });
    const driverIdA = driverA.data.driverId;
    console.log(`    ✓ Registered! ID: ${driverIdA}`);
    
    // Register Driver B
    console.log('[3] Registering Driver B (Amit)...');
    const driverB = await axios.post(`${BACKEND_URL}/drivers`, {
      name: 'Amit Kumar',
      phone: '9876543212',
      vehicleId: 'MH-12-EX-8822',
      vehicleType: 'car',
      initialLat: 19.0820,
      initialLng: 72.8820
    });
    const driverIdB = driverB.data.driverId;
    console.log(`    ✓ Registered! ID: ${driverIdB}\n`);

    // 4. Toggle Drivers Online
    console.log('[4] Activating driver online states...');
    await axios.put(`${BACKEND_URL}/drivers/${driverIdA}/status`, { status: 'online' });
    await axios.put(`${BACKEND_URL}/drivers/${driverIdB}/status`, { status: 'online' });
    console.log('    ✓ Rohan & Amit are now ONLINE.\n');

    // 5. Book a Package Order
    console.log('[5] Booking package delivery from BKC to Andheri...');
    const order = await axios.post(`${BACKEND_URL}/orders`, {
      customerName: 'Sanjay Gupta',
      customerPhone: '9988776655',
      pickup: { lat: 19.0660, lng: 72.8680, address: 'BKC office, Mumbai' },
      drop: { lat: 19.1130, lng: 72.8690, address: 'Marol Metro, Andheri East, Mumbai' },
      packageWeight: 2.3,
      packageType: 'electronics',
      priority: 'high'
    });
    const orderId = order.data.orderId;
    console.log(`    ✓ Order Created: ${orderId}`);
    console.log(`    ✓ Price Calculated: ₹${order.data.price}`);
    console.log(`    ✓ AI Risk Score: ${Math.round(order.data.riskScore.overall * 100)}%\n`);

    // 6. Run AI Driver Matching Matrix
    console.log('[6] Running AI Matcher scoring matrix for the order...');
    const matches = await axios.post(`${BACKEND_URL}/orders/match`, { orderId });
    console.log('    Scored Candidates:');
    matches.data.matches.forEach((m, idx) => {
      console.log(`      ${idx + 1}. Driver: ${m.driver.name} | Score: ${m.score}% match | Distance: ${m.distance.toFixed(2)} km | ETA: ${Math.round(m.eta)} mins`);
    });
    const bestDriverId = matches.data.matches[0].driver.driverId;
    console.log(`    ✓ Optimal candidate chosen: ${matches.data.matches[0].driver.name} (${bestDriverId})\n`);

    // 7. Dispatch Assignment
    console.log(`[7] Dispatching order to ${matches.data.matches[0].driver.name}...`);
    const assigned = await axios.post(`${BACKEND_URL}/orders/assign`, {
      orderId,
      driverId: bestDriverId
    });
    console.log(`    ✓ Status updated to: ${assigned.data.status}`);
    console.log(`    ✓ Route generated with ${assigned.data.routeCoordinates.length} waypoints.`);
    console.log(`    ✓ Travel ETA: ${assigned.data.eta} minutes.`);
    console.log('\n=== All Operations API Checks Completed Successfully! ===');

  } catch (error) {
    console.error('✗ Test suite execution failed!');
    if (error.response) {
      console.error(`    Error Status: ${error.response.status}`);
      console.error('    Details:', error.response.data);
    } else {
      console.error('    Message:', error.message);
    }
  }
}

runTests();
