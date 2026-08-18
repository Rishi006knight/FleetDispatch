package com.fleet.dispatch.controller;

import com.fleet.dispatch.model.*;
import com.fleet.dispatch.repository.DriverRepository;
import com.fleet.dispatch.repository.IncidentRepository;
import com.fleet.dispatch.repository.OrderRepository;
import com.fleet.dispatch.service.MLServiceClient;
import com.fleet.dispatch.websocket.SocketIOService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private MLServiceClient mlServiceClient;

    @Autowired
    private SocketIOService socketIOService;

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> body) {
        try {
            String customerName = (String) body.get("customerName");
            String customerPhone = (String) body.get("customerPhone");
            Map<String, Object> pickupMap = (Map<String, Object>) body.get("pickup");
            Map<String, Object> dropMap = (Map<String, Object>) body.get("drop");

            Double packageWeight = null;
            if (body.get("packageWeight") != null) {
                packageWeight = Double.valueOf(body.get("packageWeight").toString());
            } else if (body.get("package") != null) {
                Map<String, Object> pkg = (Map<String, Object>) body.get("package");
                if (pkg.get("weight") != null) {
                    packageWeight = Double.valueOf(pkg.get("weight").toString());
                }
            } else if (body.get("packageDetails") != null) {
                Map<String, Object> pkg = (Map<String, Object>) body.get("packageDetails");
                if (pkg.get("weight") != null) {
                    packageWeight = Double.valueOf(pkg.get("weight").toString());
                }
            }

            String packageType = null;
            if (body.get("packageType") != null) {
                packageType = (String) body.get("packageType");
            } else if (body.get("package") != null) {
                Map<String, Object> pkg = (Map<String, Object>) body.get("package");
                packageType = (String) pkg.get("type");
            } else if (body.get("packageDetails") != null) {
                Map<String, Object> pkg = (Map<String, Object>) body.get("packageDetails");
                packageType = (String) pkg.get("type");
            }

            if (customerName == null || pickupMap == null || dropMap == null || packageWeight == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required order fields."));
            }

            String priority = (String) body.getOrDefault("priority", "medium");
            if (body.get("packageDetails") != null) {
                Map<String, Object> pkg = (Map<String, Object>) body.get("packageDetails");
                if (pkg.get("priority") != null) {
                    priority = pkg.get("priority").toString();
                }
            }
            String startWindow = (String) body.getOrDefault("startWindow", "08:00");
            String endWindow = (String) body.getOrDefault("endWindow", "20:00");

            // Warehouse & Storage options
            String warehouseId = (String) body.getOrDefault("warehouseId", null);
            String warehouseName = (String) body.getOrDefault("warehouseName", null);
            int storageDays = body.get("storageDays") != null ? Integer.parseInt(body.get("storageDays").toString()) : 0;
            String storageType = (String) body.getOrDefault("storageType", "None");
            boolean requiresHandling = body.get("requiresHandling") != null && Boolean.parseBoolean(body.get("requiresHandling").toString());

            if (body.get("warehouseServices") != null) {
                Map<String, Object> ws = (Map<String, Object>) body.get("warehouseServices");
                if (ws.get("facilityId") != null) warehouseId = ws.get("facilityId").toString();
                if (ws.get("storageType") != null) storageType = ws.get("storageType").toString();
                if (ws.get("days") != null) storageDays = Integer.parseInt(ws.get("days").toString());
                if (ws.get("handlingRequired") != null) requiresHandling = Boolean.parseBoolean(ws.get("handlingRequired").toString());
            }

            Location pickup = new Location(
                    Double.parseDouble(pickupMap.get("lat").toString()),
                    Double.parseDouble(pickupMap.get("lng").toString()),
                    (String) pickupMap.getOrDefault("address", "Pickup Location")
            );

            Location drop = new Location(
                    Double.parseDouble(dropMap.get("lat").toString()),
                    Double.parseDouble(dropMap.get("lng").toString()),
                    (String) dropMap.getOrDefault("address", "Drop Location")
            );

            // Calculate Tamil Nadu highway transit distance in km
            double latDiff = drop.getLat() - pickup.getLat();
            double lngDiff = drop.getLng() - pickup.getLng();
            double distance = Math.max(8.0, Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111.0);

            // Compute Commercial Heavy Freight & Warehouse Billing Estimates (using tons for calc)
            double weightInTons = packageWeight > 100 ? packageWeight / 1000.0 : packageWeight;
            double freightBase = Math.round((8500.0 + distance * 35.0 + weightInTons * 1200.0) * 100.0) / 100.0;
            double weightSurcharge = Math.round((weightInTons * 180.0) * 100.0) / 100.0;
            double dailyStorageRate = "Cold Storage".equalsIgnoreCase(storageType) ? 600.0 : 350.0;
            double storageFee = Math.round((storageDays * dailyStorageRate) * 100.0) / 100.0;
            double handlingFee = requiresHandling ? 1250.0 : 0.0;
            double tollSurcharge = Math.round((distance * 5.5) * 100.0) / 100.0;

            BillingDetails billing = new BillingDetails(freightBase, weightSurcharge, storageFee, handlingFee, tollSurcharge);
            billing.setNotes("Commercial Freight Quote for Tamil Nadu Corridor (" + Math.round(distance) + " km)");

            RiskScore riskScore = mlServiceClient.predictRisk(distance, priority, packageWeight, 5.0, 1.0, "clear");

            String orderId = "ORD-" + (int) (100000 + Math.random() * 900000);

            String businessCode = (String) body.getOrDefault("businessCode", "ABC123");
            if (businessCode == null || businessCode.isBlank()) {
                businessCode = "ABC123";
            }

            Order order = new Order();
            order.setOrderId(orderId);
            order.setCustomerName(customerName);
            order.setCustomerPhone(customerPhone != null ? customerPhone : "9840123456");
            order.setBusinessCode(businessCode.toUpperCase().trim());
            order.setPickup(pickup);
            order.setDrop(drop);
            order.setPackageInfo(new PackageInfo(packageWeight, packageType != null ? packageType : "Heavy Machinery & Industrial Equipment"));
            order.setPriority(priority);
            order.setDeliveryWindow(new DeliveryWindow(startWindow, endWindow));
            order.setPrice(billing.getTotalAmount());
            order.setStatus("quote_requested");
            order.setWarehouseId(warehouseId);
            order.setWarehouseName(warehouseName);
            order.setStorageDays(storageDays);
            order.setStorageType(storageType);
            order.setRequiresHandling(requiresHandling);
            order.setQuotationStatus("pending_quote");
            order.setBillingDetails(billing);
            order.setRiskScore(riskScore);
            order.setEta(Math.round(distance * 1.8 + 15.0)); // Commercial truck transit duration
            order.setRouteCoordinates(new ArrayList<>(Arrays.asList(pickup, drop)));

            Order savedOrder = orderRepository.save(order);

            // Broadcast real-time event to Dispatcher & Customer
            socketIOService.emit("ORDER_CREATED", savedOrder);
            socketIOService.emit("QUOTE_REQUESTED", savedOrder);

            return ResponseEntity.status(HttpStatus.CREATED).body(savedOrder);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    // Dispatcher presents finalized quotation bill to customer
    @RequestMapping(value = {"/{orderId}/present-bill", "/{orderId}/quote-bill"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> presentBillToCustomer(@PathVariable String orderId, @RequestBody Map<String, Object> body) {
        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found."));
        }

        Order order = orderOpt.get();
        BillingDetails currentBilling = order.getBillingDetails() != null ? order.getBillingDetails() : new BillingDetails(18500, 0, 1800, 1250, 2400);

        double freightBase = body.get("freightBase") != null ? Double.parseDouble(body.get("freightBase").toString()) : currentBilling.getFreightBase();
        double weightSurcharge = body.get("weightSurcharge") != null ? Double.parseDouble(body.get("weightSurcharge").toString()) : currentBilling.getWeightSurcharge();
        double storageFee = body.get("storageFee") != null ? Double.parseDouble(body.get("storageFee").toString()) : currentBilling.getStorageFee();
        double handlingFee = body.get("handlingFee") != null ? Double.parseDouble(body.get("handlingFee").toString()) : currentBilling.getHandlingFee();
        double tollSurcharge = body.get("tollSurcharge") != null ? Double.parseDouble(body.get("tollSurcharge").toString()) : currentBilling.getTollSurcharge();
        String notes = (String) body.getOrDefault("notes", "Official B2B Freight & Warehouse Storage Quotation");

        BillingDetails finalBilling = new BillingDetails(freightBase, weightSurcharge, storageFee, handlingFee, tollSurcharge);
        finalBilling.setNotes(notes);

        order.setBillingDetails(finalBilling);
        order.setPrice(finalBilling.getTotalAmount());
        order.setStatus("bill_presented");
        order.setQuotationStatus("quoted");

        Order saved = orderRepository.save(order);

        // Broadcast to Customer & Admin
        socketIOService.emit("BILL_QUOTED", saved);
        socketIOService.emit("ORDER_STATUS_UPDATED", saved);

        return ResponseEntity.ok(saved);
    }

    // Customer accepts quotation bill
    @RequestMapping(value = {"/{orderId}/accept-bill"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> acceptBill(@PathVariable String orderId) {
        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found."));
        }

        Order order = orderOpt.get();
        order.setStatus("ready_for_dispatch");
        order.setQuotationStatus("accepted");
        Order saved = orderRepository.save(order);

        socketIOService.emit("BILL_ACCEPTED", saved);
        socketIOService.emit("ORDER_STATUS_UPDATED", saved);

        return ResponseEntity.ok(saved);
    }

    // Customer rejects quotation bill
    @RequestMapping(value = {"/{orderId}/reject-bill"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> rejectBill(@PathVariable String orderId) {
        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found."));
        }

        Order order = orderOpt.get();
        order.setStatus("bill_rejected");
        order.setQuotationStatus("rejected");
        Order saved = orderRepository.save(order);

        socketIOService.emit("BILL_REJECTED", saved);
        socketIOService.emit("ORDER_STATUS_UPDATED", saved);

        return ResponseEntity.ok(saved);
    }

    // Customer accepts or rejects quotation (Generic endpoint)
    @RequestMapping(value = {"/{orderId}/customer-decision"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> customerDecision(@PathVariable String orderId, @RequestBody Map<String, String> body) {
        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found."));
        }

        Order order = orderOpt.get();
        String decision = body.get("decision"); // "accept" or "reject"

        if ("accept".equalsIgnoreCase(decision)) {
            order.setStatus("ready_for_dispatch");
            order.setQuotationStatus("accepted");
            Order saved = orderRepository.save(order);
            socketIOService.emit("BILL_ACCEPTED", saved);
            socketIOService.emit("ORDER_STATUS_UPDATED", saved);
            return ResponseEntity.ok(Map.of("success", true, "message", "Quotation accepted by customer. Ready for Heavy Truck dispatch!", "order", saved));
        } else {
            order.setStatus("bill_rejected");
            order.setQuotationStatus("rejected");
            Order saved = orderRepository.save(order);
            socketIOService.emit("BILL_REJECTED", saved);
            socketIOService.emit("ORDER_STATUS_UPDATED", saved);
            return ResponseEntity.ok(Map.of("success", true, "message", "Quotation declined by customer.", "order", saved));
        }
    }

    // Dispatcher sends request to respective driver of source origin hub
    @RequestMapping(value = {"/{orderId}/send-dispatch-request", "/{orderId}/request-dispatch"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> sendDispatchRequestToDriver(@PathVariable String orderId, @RequestBody Map<String, String> body) {
        String driverId = body.get("driverId");

        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        Optional<Driver> driverOpt = driverRepository.findByDriverId(driverId);

        if (orderOpt.isEmpty() || driverOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order or Heavy Truck Driver not found."));
        }

        Order order = orderOpt.get();
        Driver driver = driverOpt.get();

        order.setStatus("dispatch_requested");
        order.setDispatchStatus("requested");
        order.setDispatchRequestedDriverId(driverId);
        order.setDispatchRequestedDriverName(driver.getName());

        Order saved = orderRepository.save(order);

        Map<String, Object> payload = new HashMap<>();
        payload.put("order", saved);
        payload.put("driver", driver);

        // Alert specific driver and update status across all portals
        socketIOService.emit("ORDER_DISPATCH_REQUEST", payload);
        socketIOService.emit("ORDER_STATUS_UPDATED", saved);

        return ResponseEntity.ok(Map.of("success", true, "message", "Dispatch request sent to source heavy truck driver " + driver.getName(), "order", saved));
    }

    // Driver responds to dispatch request (Accepts or Declines)
    @RequestMapping(value = {"/{orderId}/driver-response", "/{orderId}/dispatch-response"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> driverResponseToDispatch(@PathVariable String orderId, @RequestBody Map<String, String> body) {
        String driverId = body.get("driverId");
        String decision = body.get("decision"); // "accept" or "decline"

        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        Optional<Driver> driverOpt = driverRepository.findByDriverId(driverId);

        if (orderOpt.isEmpty() || driverOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order or Driver not found."));
        }

        Order order = orderOpt.get();
        Driver driver = driverOpt.get();

        if ("accept".equalsIgnoreCase(decision)) {
            driver.setStatus("busy");
            driverRepository.save(driver);

            // Calculate route waypoints from Driver -> Pickup -> Drop
            Map<String, Object> routeResult = mlServiceClient.optimizeRoute(driver.getCurrentLocation(), order.getPickup(), order.getDrop());
            List<Location> route = (List<Location>) routeResult.get("route");
            Double eta = (Double) routeResult.get("total_eta_minutes");

            order.setDriverId(driverId);
            order.setStatus("driver_assigned");
            order.setDispatchStatus("accepted");
            order.setRouteCoordinates(route != null ? route : Arrays.asList(order.getPickup(), order.getDrop()));
            order.setEta(eta != null ? eta : order.getEta());

            Order saved = orderRepository.save(order);

            Map<String, Object> assignmentPayload = new HashMap<>();
            assignmentPayload.put("order", saved);
            assignmentPayload.put("driver", driver);

            socketIOService.emit("ORDER_ASSIGNED", assignmentPayload);
            socketIOService.emit("DRIVER_UPDATED", driver);
            socketIOService.emit("ORDER_STATUS_UPDATED", saved);

            return ResponseEntity.ok(Map.of("success", true, "message", "Consignment load accepted! Navigation ready.", "order", saved));
        } else {
            // Driver declined load -> return order to ready_for_dispatch state for re-dispatch
            order.setStatus("ready_for_dispatch");
            order.setDispatchStatus("declined");
            order.setDispatchRequestedDriverId(null);
            order.setDispatchRequestedDriverName(null);

            Order saved = orderRepository.save(order);

            socketIOService.emit("DISPATCH_REQUEST_DECLINED", Map.of("order", saved, "driver", driver));
            socketIOService.emit("ORDER_STATUS_UPDATED", saved);

            return ResponseEntity.ok(Map.of("success", true, "message", "Consignment load declined.", "order", saved));
        }
    }

    @PostMapping("/match")
    public ResponseEntity<?> matchDriver(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found."));
        }

        Order order = orderOpt.get();
        List<Driver> onlineDrivers = driverRepository.findByStatus("online");
        if (onlineDrivers.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No online heavy trucks available in Tamil Nadu fleet."));
        }

        List<Map<String, Object>> scoredDrivers = new ArrayList<>();
        for (Driver driver : onlineDrivers) {
            double latDiff = order.getPickup().getLat() - driver.getCurrentLocation().getLat();
            double lngDiff = order.getPickup().getLng() - driver.getCurrentLocation().getLng();
            double distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111.0;

            double eta = distance * 1.6 + 10.0;

            // Drivers stationed at or near the source pickup location get huge proximity bonus
            double proximityScore = Math.max(0.0, 100.0 - distance * 4.0);
            double etaScore = Math.max(0.0, 100.0 - eta * 2.5);
            double reliabilityScore = driver.getReliability() * 100.0;
            double ratingScore = (driver.getRating() / 5.0) * 100.0;
            double churnPenalty = (1.0 - driver.getChurnRisk()) * 100.0;

            // Extra bonus if driver is stationed at the source origin hub (< 15 km away)
            double sourceTerminalBonus = distance < 15.0 ? 25.0 : 0.0;

            double totalScore = Math.min(99.0, (
                    proximityScore * 0.35 +
                    etaScore * 0.20 +
                    reliabilityScore * 0.15 +
                    ratingScore * 0.10 +
                    churnPenalty * 0.20 +
                    sourceTerminalBonus
            ));

            Map<String, Object> matchItem = new HashMap<>();
            matchItem.put("driver", driver);
            matchItem.put("distance", distance);
            matchItem.put("eta", eta);
            matchItem.put("isSourceDriver", distance < 25.0);
            matchItem.put("score", Math.round(totalScore));
            scoredDrivers.add(matchItem);
        }

        // Sort descending by score
        scoredDrivers.sort((a, b) -> Long.compare((Long) b.get("score"), (Long) a.get("score")));

        Map<String, Object> response = new HashMap<>();
        response.put("order", order);
        response.put("matches", scoredDrivers.stream().limit(6).collect(Collectors.toList()));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/assign")
    public ResponseEntity<?> assignDriverDirectly(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        String driverId = body.get("driverId");

        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        Optional<Driver> driverOpt = driverRepository.findByDriverId(driverId);

        if (orderOpt.isEmpty() || driverOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order or Heavy Truck Driver not found."));
        }

        Order order = orderOpt.get();
        Driver driver = driverOpt.get();

        driver.setStatus("busy");
        driverRepository.save(driver);

        Map<String, Object> routeResult = mlServiceClient.optimizeRoute(driver.getCurrentLocation(), order.getPickup(), order.getDrop());
        List<Location> route = (List<Location>) routeResult.get("route");
        Double eta = (Double) routeResult.get("total_eta_minutes");

        order.setDriverId(driverId);
        order.setStatus("assigned");
        order.setDispatchStatus("accepted");
        order.setRouteCoordinates(route != null ? route : Arrays.asList(order.getPickup(), order.getDrop()));
        order.setEta(eta != null ? eta : order.getEta());

        Order savedOrder = orderRepository.save(order);

        Map<String, Object> assignmentPayload = new HashMap<>();
        assignmentPayload.put("order", savedOrder);
        assignmentPayload.put("driver", driver);

        socketIOService.emit("ORDER_ASSIGNED", assignmentPayload);
        socketIOService.emit("DRIVER_UPDATED", driver);
        socketIOService.emit("ORDER_STATUS_UPDATED", savedOrder);

        return ResponseEntity.ok(savedOrder);
    }

    @PutMapping("/{orderId}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String orderId, @RequestBody Map<String, String> body) {
        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found."));
        }

        Order order = orderOpt.get();
        String newStatus = body.get("status");
        order.setStatus(newStatus);

        if ("completed".equalsIgnoreCase(newStatus) && order.getDriverId() != null) {
            Optional<Driver> driverOpt = driverRepository.findByDriverId(order.getDriverId());
            if (driverOpt.isPresent()) {
                Driver driver = driverOpt.get();
                driver.setStatus("online");
                driver.setEarnings(driver.getEarnings() + order.getPrice());
                driver.setCompletedDeliveries(driver.getCompletedDeliveries() + 1);
                driverRepository.save(driver);
                socketIOService.emit("DRIVER_UPDATED", driver);
            }
        } else if ("failed".equalsIgnoreCase(newStatus) && order.getDriverId() != null) {
            Optional<Driver> driverOpt = driverRepository.findByDriverId(order.getDriverId());
            if (driverOpt.isPresent()) {
                Driver driver = driverOpt.get();
                driver.setStatus("online");
                driver.setCancellationRate(Math.min(1.0, driver.getCancellationRate() + 0.05));
                driverRepository.save(driver);
                socketIOService.emit("DRIVER_UPDATED", driver);
            }
        }

        Order savedOrder = orderRepository.save(order);
        socketIOService.emit("ORDER_STATUS_UPDATED", savedOrder);

        return ResponseEntity.ok(savedOrder);
    }

    @RequestMapping(value = {"/{orderId}/complete"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> completeOrder(@PathVariable String orderId, @RequestBody(required = false) Map<String, Object> body) {
        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found."));
        }

        Order order = orderOpt.get();
        order.setStatus("completed");
        order.setPodStatus("verified");

        if (order.getDriverId() != null) {
            Optional<Driver> driverOpt = driverRepository.findByDriverId(order.getDriverId());
            if (driverOpt.isPresent()) {
                Driver driver = driverOpt.get();
                driver.setStatus("online");
                driver.setEarnings(driver.getEarnings() + order.getPrice());
                driver.setCompletedDeliveries(driver.getCompletedDeliveries() + 1);
                driverRepository.save(driver);
                socketIOService.emit("DRIVER_UPDATED", driver);
            }
        }

        Order savedOrder = orderRepository.save(order);
        socketIOService.emit("ORDER_STATUS_UPDATED", savedOrder);

        return ResponseEntity.ok(savedOrder);
    }

    @PostMapping("/{orderId}/verify-pod")
    public ResponseEntity<?> verifyPOD(@PathVariable String orderId, @RequestBody Map<String, Object> body) {
        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found."));
        }

        Order order = orderOpt.get();
        String photoBase64 = (String) body.get("photoBase64");
        Map<String, Object> driverLocMap = (Map<String, Object>) body.get("driverLocation");

        double driverLat = 0.0;
        double driverLng = 0.0;
        if (driverLocMap != null) {
            driverLat = Double.parseDouble(driverLocMap.get("lat").toString());
            driverLng = Double.parseDouble(driverLocMap.get("lng").toString());
        }

        order.setPodPhotoUrl(photoBase64);
        order.setPodStatus("pending");
        orderRepository.save(order);
        socketIOService.emit("ORDER_STATUS_UPDATED", order);

        // Call Python CV Verifier
        Map<String, Object> cvResult = mlServiceClient.verifyPOD(
                photoBase64,
                driverLat,
                driverLng,
                order.getDrop().getLat(),
                order.getDrop().getLng()
        );

        boolean passed = (Boolean) cvResult.getOrDefault("passed", true);
        String reason = (String) cvResult.getOrDefault("message", "Proof verified.");
        Double score = (Double) cvResult.getOrDefault("confidence_score", 0.95);

        if (passed) {
            order.setPodStatus("verified");
            order.setStatus("completed");
            orderRepository.save(order);

            if (order.getDriverId() != null) {
                Optional<Driver> driverOpt = driverRepository.findByDriverId(order.getDriverId());
                if (driverOpt.isPresent()) {
                    Driver driver = driverOpt.get();
                    driver.setStatus("online");
                    driver.setEarnings(driver.getEarnings() + order.getPrice());
                    driver.setCompletedDeliveries(driver.getCompletedDeliveries() + 1);
                    driverRepository.save(driver);
                    socketIOService.emit("DRIVER_UPDATED", driver);
                }
            }

            socketIOService.emit("ORDER_STATUS_UPDATED", order);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Cargo Proof of Delivery verified successfully.");
            response.put("order", order);
            return ResponseEntity.ok(response);
        } else {
            order.setPodStatus("rejected");
            orderRepository.save(order);

            Incident incident = new Incident(
                    "INC-" + (int) (100000 + Math.random() * 900000),
                    orderId,
                    order.getDriverId(),
                    "fraud_pod",
                    "high",
                    "Cargo Proof of Delivery Mismatch: " + reason + " (Confidence Score: " + Math.round(score * 100) + "%)"
            );
            incidentRepository.save(incident);

            socketIOService.emit("INCIDENT_CREATED", incident);
            socketIOService.emit("ORDER_STATUS_UPDATED", order);

            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Delivery Verification Failed: " + reason);
            response.put("order", order);
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders(@RequestParam(required = false) String businessCode) {
        List<Order> all = orderRepository.findAllByOrderByCreatedAtDesc();
        if (businessCode != null && !businessCode.isBlank()) {
            return ResponseEntity.ok(all.stream()
                    .filter(o -> businessCode.equalsIgnoreCase(o.getBusinessCode()))
                    .collect(Collectors.toList()));
        }
        return ResponseEntity.ok(all);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrderById(@PathVariable String orderId) {
        Optional<Order> order = orderRepository.findByOrderId(orderId);
        if (order.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found."));
        }
        return ResponseEntity.ok(order.get());
    }
}
