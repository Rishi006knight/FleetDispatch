const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== Tamil Nadu Freight & Warehouse Management System: API Verification ===\n');

  try {
    // 1. Check health
    console.log('[1] Checking Java backend server health...');
    const health = await axios.get('http://localhost:5000/health');
    console.log(`    Status: ${health.data.status}`);
    console.log(`    Database State: ${health.data.database}`);
    console.log(`    System: ${health.data.system}`);
    console.log('    ✓ Health check passed!\n');

    // 2. Fetch seed heavy truck drivers
    console.log('[2] Fetching initial Tamil Nadu commercial heavy truck fleet...');
    const driversRes = await axios.get(`${BACKEND_URL}/drivers`);
    console.log(`    ✓ Active Heavy Trucks: ${driversRes.data.length} vehicles stationed across TN Hubs.`);
    driversRes.data.slice(0, 3).forEach(d => {
      console.log(`      - ${d.name} (${d.vehicleId}) | ${d.vehicleType} | Rating: ${d.rating} ★`);
    });
    console.log('');

    // 3. Book B2B Heavy Freight & Warehouse Storage Request (Coimbatore -> Chennai Port)
    console.log('[3] Shipper books 15 Tonne Machinery Freight from Coimbatore Hub to Chennai Port with 4 Days Cold/Pallet Storage...');
    const order = await axios.post(`${BACKEND_URL}/orders`, {
      customerName: 'Kovai Industrial Components Ltd',
      customerPhone: '9840112233',
      pickup: { lat: 11.0168, lng: 76.9558, address: 'Peelamedu Industrial Logistics Park, Coimbatore' },
      drop: { lat: 13.0844, lng: 80.2936, address: 'Chennai Port Trust Container Terminal, Rajaji Salai, Chennai' },
      packageWeight: 15.0,
      packageType: 'Heavy Machinery & Parts',
      priority: 'high',
      warehouseId: 'chennai-port',
      warehouseName: 'Chennai Port Container Terminal & CFS',
      storageDays: 4,
      storageType: 'Pallet Staging',
      requiresHandling: true
    });
    const orderId = order.data.orderId;
    console.log(`    ✓ Consignment Request Created: ${orderId}`);
    console.log(`    ✓ Status: ${order.data.status} (Awaiting Dispatcher Official Bill)`);
    console.log(`    ✓ Preliminary Base Freight: ₹${order.data.billingDetails?.freightBase}`);
    console.log(`    ✓ Warehouse Storage Fee: ₹${order.data.billingDetails?.storageFee}`);
    console.log(`    ✓ Total Estimated Bill (with 18% GST): ₹${order.data.price}\n`);

    // 4. Dispatcher Presents Finalized Bill to Shipper
    console.log('[4] Dispatcher reviews cargo, applies special storage handling rates, and presents official Bill...');
    const quotedRes = await axios.post(`${BACKEND_URL}/orders/${orderId}/present-bill`, {
      freightBase: 22000.0,
      weightSurcharge: 2700.0,
      storageFee: 15000.0,
      handlingFee: 1250.0,
      tollSurcharge: 1850.0,
      notes: 'Express 32ft Heavy Trailer with 4-Day Pallet Staging at Chennai Port CFS'
    });
    console.log(`    ✓ Bill Presented to Shipper! Quotation Status: ${quotedRes.data.quotationStatus}`);
    console.log(`    ✓ Itemized Total: ₹${quotedRes.data.price} (Subtotal + 18% GST)\n`);

    // 5. Shipper Accepts Quotation Bill
    console.log('[5] Shipper reviews and ACCEPTS the official Freight & Storage Bill...');
    const acceptRes = await axios.post(`${BACKEND_URL}/orders/${orderId}/customer-decision`, {
      decision: 'accept'
    });
    console.log(`    ✓ Shipper Decision: ACCEPTED`);
    console.log(`    ✓ Order Status: ${acceptRes.data.order.status} (Ready for Truck Dispatch)\n`);

    // 6. AI Heavy Truck Driver Matching Matrix
    console.log('[6] Running AI Matcher scoring matrix for Commercial Heavy Trucks...');
    const matches = await axios.post(`${BACKEND_URL}/orders/match`, { orderId });
    console.log('    Top Matched Heavy Trucks:');
    matches.data.matches.forEach((m, idx) => {
      console.log(`      ${idx + 1}. ${m.driver.name} (${m.driver.vehicleId}) | ${m.driver.vehicleType} | Score: ${m.score}% | ETA: ${Math.round(m.eta)} mins`);
    });
    const bestDriverId = matches.data.matches[0].driver.driverId;
    console.log(`    ✓ Optimal Heavy Truck chosen: ${matches.data.matches[0].driver.name} (${bestDriverId})\n`);

    // 7. Dispatch Assignment
    console.log(`[7] Dispatching order to ${matches.data.matches[0].driver.name}...`);
    const assigned = await axios.post(`${BACKEND_URL}/orders/assign`, {
      orderId,
      driverId: bestDriverId
    });
    console.log(`    ✓ Status updated to: ${assigned.data.status}`);
    console.log(`    ✓ Highway Route Generated: ${assigned.data.routeCoordinates.length} waypoints.`);
    console.log(`    ✓ Estimated Highway Travel Time: ${assigned.data.eta} minutes.`);
    console.log('\n=== All Tamil Nadu Freight & Warehouse Billing Checks Completed Successfully! ===');

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
