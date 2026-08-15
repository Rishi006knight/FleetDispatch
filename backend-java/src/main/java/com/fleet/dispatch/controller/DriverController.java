package com.fleet.dispatch.controller;

import com.fleet.dispatch.model.Driver;
import com.fleet.dispatch.model.Incident;
import com.fleet.dispatch.model.Location;
import com.fleet.dispatch.model.Order;
import com.fleet.dispatch.model.Telemetry;
import com.fleet.dispatch.repository.DriverRepository;
import com.fleet.dispatch.repository.IncidentRepository;
import com.fleet.dispatch.repository.OrderRepository;
import com.fleet.dispatch.repository.TelemetryRepository;
import com.fleet.dispatch.service.MLServiceClient;
import com.fleet.dispatch.websocket.SocketIOService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/drivers")
@CrossOrigin(origins = "*")
public class DriverController {

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private TelemetryRepository telemetryRepository;

    @Autowired
    private MLServiceClient mlServiceClient;

    @Autowired
    private SocketIOService socketIOService;

    @PostMapping
    public ResponseEntity<?> registerDriver(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String phone = (String) body.get("phone");
        String vehicleId = (String) body.get("vehicleId");

        if (name == null || phone == null || vehicleId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required driver fields."));
        }

        String vehicleType = (String) body.getOrDefault("vehicleType", "bike");
        double initialLat = body.get("initialLat") != null ? Double.parseDouble(body.get("initialLat").toString()) : 19.0760;
        double initialLng = body.get("initialLng") != null ? Double.parseDouble(body.get("initialLng").toString()) : 72.8777;

        String driverId = "DRV-" + (int)(100 + Math.random() * 900);

        Driver driver = new Driver();
        driver.setDriverId(driverId);
        driver.setName(name);
        driver.setPhone(phone);
        driver.setVehicleId(vehicleId);
        driver.setVehicleType(vehicleType);
        driver.setStatus("offline");
        driver.setCurrentLocation(new Location(initialLat, initialLng));
        driver.setRating(Math.round((4.8 + Math.random() * 0.2) * 100.0) / 100.0);
        driver.setReliability(Math.round((0.9 + Math.random() * 0.1) * 100.0) / 100.0);
        driver.setChurnRisk(Math.round((0.05 + Math.random() * 0.1) * 100.0) / 100.0);

        Driver savedDriver = driverRepository.save(driver);
        socketIOService.emit("DRIVER_UPDATED", savedDriver);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedDriver);
    }

    @GetMapping
    public ResponseEntity<List<Driver>> getDrivers() {
        return ResponseEntity.ok(driverRepository.findAll());
    }

    @PutMapping("/{driverId}/status")
    public ResponseEntity<?> toggleStatus(@PathVariable String driverId, @RequestBody Map<String, String> body) {
        Optional<Driver> driverOpt = driverRepository.findByDriverId(driverId);
        if (driverOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Driver not found."));
        }

        Driver driver = driverOpt.get();
        driver.setStatus(body.get("status"));
        Driver saved = driverRepository.save(driver);

        socketIOService.emit("DRIVER_UPDATED", saved);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{driverId}/telemetry")
    public ResponseEntity<?> updateLocation(@PathVariable String driverId, @RequestBody Map<String, Object> body) {
        Optional<Driver> driverOpt = driverRepository.findByDriverId(driverId);
        if (driverOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Driver not found."));
        }

        Driver driver = driverOpt.get();
        double lat = Double.parseDouble(body.get("lat").toString());
        double lng = Double.parseDouble(body.get("lng").toString());
        double speed = body.get("speed") != null ? Double.parseDouble(body.get("speed").toString()) : 0.0;
        double heading = body.get("heading") != null ? Double.parseDouble(body.get("heading").toString()) : 0.0;
        String activeOrderId = (String) body.get("activeOrderId");

        driver.setCurrentLocation(new Location(lat, lng));
        driverRepository.save(driver);

        // Save telemetry log
        Telemetry telemetry = new Telemetry(driverId, activeOrderId, new Location(lat, lng), speed, heading);
        telemetryRepository.save(telemetry);

        // Broadcast telemetry update
        Map<String, Object> telemetryPayload = new HashMap<>();
        telemetryPayload.put("driverId", driverId);
        telemetryPayload.put("location", Map.of("lat", lat, "lng", lng));
        telemetryPayload.put("speed", speed);
        telemetryPayload.put("heading", heading);
        telemetryPayload.put("activeOrderId", activeOrderId);
        socketIOService.emit("TELEMETRY_UPDATED", telemetryPayload);

        // If driver is busy delivering, check for route deviations via Python ML
        if (activeOrderId != null) {
            Optional<Order> orderOpt = orderRepository.findByOrderId(activeOrderId);
            if (orderOpt.isPresent() && "out_for_delivery".equalsIgnoreCase(orderOpt.get().getStatus())) {
                Order order = orderOpt.get();
                Map<String, Object> devResult = mlServiceClient.detectDeviation(lat, lng, order.getRouteCoordinates());
                boolean deviated = (Boolean) devResult.getOrDefault("deviated", false);
                if (deviated) {
                    double distMeters = ((Number) devResult.getOrDefault("distance_meters", 0.0)).doubleValue();
                    Optional<Incident> openInc = incidentRepository.findOpenIncident(activeOrderId, "route_deviation");
                    if (openInc.isEmpty()) {
                        Incident inc = new Incident(
                                "INC-" + (int)(100000 + Math.random() * 900000),
                                activeOrderId,
                                driverId,
                                "route_deviation",
                                "medium",
                                "Route Deviation Detected: Driver is " + Math.round(distMeters) + " meters off the optimized path!"
                        );
                        incidentRepository.save(inc);
                        socketIOService.emit("INCIDENT_CREATED", inc);
                    }
                }
            }
        }

        // Periodically update churn predictions
        if (Math.random() < 0.1) {
            Double churnProb = mlServiceClient.predictChurn(driver.getCancellationRate(), driver.getRating(), driver.getCompletedDeliveries(), driver.getEarnings());
            if (churnProb != null) {
                double oldRisk = driver.getChurnRisk();
                driver.setChurnRisk(churnProb);
                driverRepository.save(driver);

                if (driver.getChurnRisk() > 0.7 && oldRisk <= 0.7) {
                    Incident churnIncident = new Incident(
                            "INC-" + (int)(100000 + Math.random() * 900000),
                            null,
                            driverId,
                            "delay",
                            "medium",
                            "High Churn Risk: Driver " + driver.getName() + " has a " + Math.round(driver.getChurnRisk() * 100) + "% chance of leaving the platform within 30 days. Recommend retention bonus."
                    );
                    incidentRepository.save(churnIncident);
                    socketIOService.emit("INCIDENT_CREATED", churnIncident);
                }
                socketIOService.emit("DRIVER_UPDATED", driver);
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("driver", driver);
        return ResponseEntity.ok(res);
    }
}
