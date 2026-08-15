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
import jakarta.annotation.PostConstruct;
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

    @PostConstruct
    public void seedInitialTamilNaduTruckFleet() {
        if (driverRepository.count() == 0) {
            // Seed Tamil Nadu Heavy Commercial Fleet
            Driver d1 = new Driver();
            d1.setDriverId("TRK-101");
            d1.setName("Murugan (Express Freightliner)");
            d1.setPhone("9840112233");
            d1.setVehicleId("TN-01-TR-8841");
            d1.setVehicleType("32ft Heavy Trailer");
            d1.setStatus("online");
            d1.setCurrentLocation(new Location(13.0844, 80.2936, "Chennai Port Container Terminal"));
            d1.setRating(4.92);
            d1.setReliability(0.98);
            d1.setEarnings(48500.0);
            d1.setCompletedDeliveries(64);
            driverRepository.save(d1);

            Driver d2 = new Driver();
            d2.setDriverId("TRK-102");
            d2.setName("Senthil Kumar (Reefer Cold Fleet)");
            d2.setPhone("9840223344");
            d2.setVehicleId("TN-38-CT-9022");
            d2.setVehicleType("Refrigerated Reefer Truck");
            d2.setStatus("online");
            d2.setCurrentLocation(new Location(11.0168, 76.9558, "Coimbatore Logistics Hub"));
            d2.setRating(4.88);
            d2.setReliability(0.95);
            d2.setEarnings(36200.0);
            d2.setCompletedDeliveries(42);
            driverRepository.save(d2);

            Driver d3 = new Driver();
            d3.setDriverId("TRK-103");
            d3.setName("Arumugam (Multi-Axle Heavy)");
            d3.setPhone("9840334455");
            d3.setVehicleId("TN-58-MD-4410");
            d3.setVehicleType("20ft Multi-Axle Truck");
            d3.setStatus("online");
            d3.setCurrentLocation(new Location(9.9252, 78.1198, "Madurai Ring Road Hub"));
            d3.setRating(4.95);
            d3.setReliability(0.97);
            d3.setEarnings(52000.0);
            d3.setCompletedDeliveries(58);
            driverRepository.save(d3);

            Driver d4 = new Driver();
            d4.setDriverId("TRK-104");
            d4.setName("Karthik Raja (Container Express)");
            d4.setPhone("9840445566");
            d4.setVehicleId("TN-27-SL-1102");
            d4.setVehicleType("14ft Eicher Container");
            d4.setStatus("online");
            d4.setCurrentLocation(new Location(11.6643, 78.1460, "Salem Steel Plant Road Hub"));
            d4.setRating(4.85);
            d4.setReliability(0.94);
            d4.setEarnings(29400.0);
            d4.setCompletedDeliveries(38);
            driverRepository.save(d4);

            Driver d5 = new Driver();
            d5.setDriverId("TRK-105");
            d5.setName("Velu Pandian (Port Freightliner)");
            d5.setPhone("9840556677");
            d5.setVehicleId("TN-69-TT-7733");
            d5.setVehicleType("40ft Container Freightliner");
            d5.setStatus("online");
            d5.setCurrentLocation(new Location(8.7642, 78.1348, "Thoothukudi Port Terminal"));
            d5.setRating(4.90);
            d5.setReliability(0.96);
            d5.setEarnings(61000.0);
            d5.setCompletedDeliveries(72);
            driverRepository.save(d5);
        }
    }

    @PostMapping
    public ResponseEntity<?> registerDriver(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String phone = (String) body.get("phone");
        String vehicleId = (String) body.get("vehicleId");

        if (name == null || phone == null || vehicleId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required driver fields."));
        }

        String vehicleType = (String) body.getOrDefault("vehicleType", "20ft Multi-Axle Truck");
        double initialLat = body.get("initialLat") != null ? Double.parseDouble(body.get("initialLat").toString()) : 13.0692;
        double initialLng = body.get("initialLng") != null ? Double.parseDouble(body.get("initialLng").toString()) : 80.1948;

        String driverId = "TRK-" + (int)(100 + Math.random() * 900);

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

        // If truck is busy delivering, check for route deviations via Python ML
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
                                "Highway Route Deviation: Heavy Truck " + driver.getVehicleId() + " is " + Math.round(distMeters) + "m off designated freight corridor!"
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
                            "Fleet Retention Alert: Heavy Truck Driver " + driver.getName() + " (" + driver.getVehicleId() + ") churn probability is " + Math.round(driver.getChurnRisk() * 100) + "%."
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
