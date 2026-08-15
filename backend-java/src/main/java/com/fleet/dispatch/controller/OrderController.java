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
            }

            String packageType = null;
            if (body.get("packageType") != null) {
                packageType = (String) body.get("packageType");
            } else if (body.get("package") != null) {
                Map<String, Object> pkg = (Map<String, Object>) body.get("package");
                packageType = (String) pkg.get("type");
            }

            if (customerName == null || pickupMap == null || dropMap == null || packageWeight == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required order fields."));
            }

            String priority = (String) body.getOrDefault("priority", "medium");
            String startWindow = (String) body.getOrDefault("startWindow", "12:00");
            String endWindow = (String) body.getOrDefault("endWindow", "18:00");

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

            // Distance calculation
            double latDiff = drop.getLat() - pickup.getLat();
            double lngDiff = drop.getLng() - pickup.getLng();
            double distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111.0;

            // Fetch dynamic pricing & risk from Python ML service
            int currentHour = LocalTime.now().getHour();
            double price = mlServiceClient.predictPrice(distance, priority, packageType, "clear", "normal", currentHour);
            RiskScore riskScore = mlServiceClient.predictRisk(distance, priority, packageWeight, 5.0, 1.0, "clear");

            String orderId = "ORD-" + (int) (100000 + Math.random() * 900000);

            Order order = new Order();
            order.setOrderId(orderId);
            order.setCustomerName(customerName);
            order.setCustomerPhone(customerPhone != null ? customerPhone : "9988776655");
            order.setPickup(pickup);
            order.setDrop(drop);
            order.setPackageInfo(new PackageInfo(packageWeight, packageType != null ? packageType : "standard"));
            order.setPriority(priority);
            order.setDeliveryWindow(new DeliveryWindow(startWindow, endWindow));
            order.setPrice(price);
            order.setStatus("pending");
            order.setRiskScore(riskScore);
            order.setEta(Math.round(distance * 2.5 + 5.0));
            order.setRouteCoordinates(new ArrayList<>(Arrays.asList(pickup, drop)));

            Order savedOrder = orderRepository.save(order);

            // Broadcast real-time event
            socketIOService.emit("ORDER_CREATED", savedOrder);

            return ResponseEntity.status(HttpStatus.CREATED).body(savedOrder);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
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
            return ResponseEntity.badRequest().body(Map.of("error", "No online drivers available."));
        }

        List<Map<String, Object>> scoredDrivers = new ArrayList<>();
        for (Driver driver : onlineDrivers) {
            double latDiff = order.getPickup().getLat() - driver.getCurrentLocation().getLat();
            double lngDiff = order.getPickup().getLng() - driver.getCurrentLocation().getLng();
            double distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111.0;

            double eta = distance * 2.0 + 3.0;

            double proximityScore = Math.max(0.0, 100.0 - distance * 10.0);
            double etaScore = Math.max(0.0, 100.0 - eta * 5.0);
            double reliabilityScore = driver.getReliability() * 100.0;
            double ratingScore = (driver.getRating() / 5.0) * 100.0;
            double churnPenalty = (1.0 - driver.getChurnRisk()) * 100.0;

            double totalScore = (
                    proximityScore * 0.30 +
                    etaScore * 0.20 +
                    reliabilityScore * 0.15 +
                    ratingScore * 0.15 +
                    churnPenalty * 0.20
            );

            Map<String, Object> matchItem = new HashMap<>();
            matchItem.put("driver", driver);
            matchItem.put("distance", distance);
            matchItem.put("eta", eta);
            matchItem.put("score", Math.round(totalScore));
            scoredDrivers.add(matchItem);
        }

        // Sort descending by score
        scoredDrivers.sort((a, b) -> Long.compare((Long) b.get("score"), (Long) a.get("score")));

        Map<String, Object> response = new HashMap<>();
        response.put("order", order);
        response.put("matches", scoredDrivers.stream().limit(5).collect(Collectors.toList()));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/assign")
    public ResponseEntity<?> assignDriver(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        String driverId = body.get("driverId");

        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        Optional<Driver> driverOpt = driverRepository.findByDriverId(driverId);

        if (orderOpt.isEmpty() || driverOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order or Driver not found."));
        }

        Order order = orderOpt.get();
        Driver driver = driverOpt.get();

        driver.setStatus("busy");
        driverRepository.save(driver);

        // Fetch route optimization from Python ML service
        Map<String, Object> routeResult = mlServiceClient.optimizeRoute(driver.getCurrentLocation(), order.getPickup(), order.getDrop());
        List<Location> route = (List<Location>) routeResult.get("route");
        Double eta = (Double) routeResult.get("total_eta_minutes");

        order.setDriverId(driverId);
        order.setStatus("assigned");
        order.setRouteCoordinates(route != null ? route : Arrays.asList(order.getPickup(), order.getDrop()));
        order.setEta(eta != null ? eta : order.getEta());

        Order savedOrder = orderRepository.save(order);

        // Emit WebSocket events
        Map<String, Object> assignmentPayload = new HashMap<>();
        assignmentPayload.put("order", savedOrder);
        assignmentPayload.put("driver", driver);

        socketIOService.emit("ORDER_ASSIGNED", assignmentPayload);
        socketIOService.emit("DRIVER_UPDATED", driver);

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
            response.put("message", "Proof of Delivery verified.");
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
                    "Suspicious Delivery Proof Rejected: " + reason + " (Confidence Score: " + Math.round(score * 100) + "%)"
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
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderRepository.findAll());
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
