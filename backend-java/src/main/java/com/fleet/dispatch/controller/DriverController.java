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
            // Station hubs with RTO codes, names, coordinates, vehicle types, and initial truck count
            Object[][] stationData = new Object[][]{
                { "01", "Chennai Port Container Terminal & CFS", 13.0844, 80.2936, "32ft Heavy Trailer", 4 },
                { "02", "Ennore Port (Kamarajar Bulk & CFS)", 13.2611, 80.3314, "40ft Container Freightliner", 3 },
                { "04", "Chennai - Koyambedu Freight Terminal", 13.0692, 80.1948, "20ft Multi-Axle Truck", 3 },
                { "22", "Chennai - Tambaram South Gateway", 12.9249, 80.1000, "14ft Eicher Container", 2 },
                { "38", "Coimbatore Industrial Logistics Park", 11.0168, 76.9558, "Refrigerated Reefer Truck", 4 },
                { "58", "Madurai Ring Road Logistics Terminal", 9.9252, 78.1198, "20ft Multi-Axle Truck", 3 },
                { "45", "Trichy Central Transit Corridor", 10.7905, 78.7047, "32ft Heavy Trailer", 3 },
                { "27", "Salem Steel Logistics Center", 11.6643, 78.1460, "14ft Eicher Container", 2 },
                { "72", "Tirunelveli SIPCOT Terminal", 8.7139, 77.7567, "20ft Multi-Axle Truck", 2 },
                { "23", "Vellore Industrial Logistics Park", 12.9165, 79.1325, "32ft Heavy Trailer", 2 },
                { "39", "Tiruppur Apparel Export Hub", 11.1085, 77.3411, "20ft Multi-Axle Truck", 3 },
                { "33", "Erode SIPCOT Logistics Complex", 11.3410, 77.7172, "Refrigerated Reefer Truck", 2 },
                { "69", "Thoothukudi V.O.C Port Terminal", 8.7642, 78.1348, "40ft Container Freightliner", 3 },
                { "49", "Thanjavur Delta Terminal", 10.7870, 79.1378, "14ft Eicher Container", 2 },
                { "70", "Hosur Auto & Electronics Freight Hub", 12.7409, 77.8253, "32ft Heavy Trailer", 3 },
                { "74", "Nagercoil Gateway Depot", 8.1833, 77.4119, "20ft Multi-Axle Truck", 2 },
            };

            for (Object[] station : stationData) {
                String rto = (String) station[0];
                String hubName = (String) station[1];
                double lat = (Double) station[2];
                double lng = (Double) station[3];
                String vType = (String) station[4];
                int count = (Integer) station[5];

                for (int i = 1; i <= count; i++) {
                    int driverNum = 1000 + i; // 1001, 1002, 1003...
                    String driverId = "TRK-" + rto + "-" + driverNum;
                    String vehicleId = "TN-" + rto + "-TR-" + driverNum;
                    String driverName = "Driver #" + driverNum + " (" + hubName.split(" ")[0] + " - TN-" + rto + "-" + driverNum + ")";

                    Driver d = new Driver();
                    d.setDriverId(driverId);
                    d.setName(driverName);
                    d.setPhone("9840" + rto + driverNum);
                    d.setVehicleId(vehicleId);
                    d.setVehicleType(vType);
                    d.setStatus("online");
                    // Slight coordinate jitter so trucks don't sit on identical pixel
                    double jitterLat = (Math.random() - 0.5) * 0.006;
                    double jitterLng = (Math.random() - 0.5) * 0.006;
                    d.setCurrentLocation(new Location(lat + jitterLat, lng + jitterLng, hubName));
                    d.setRating(Math.round((4.85 + Math.random() * 0.14) * 100.0) / 100.0);
                    d.setReliability(Math.round((0.95 + Math.random() * 0.04) * 100.0) / 100.0);
                    d.setEarnings(Math.round((32000.0 + Math.random() * 25000.0) * 100.0) / 100.0);
                    d.setCompletedDeliveries((int)(40 + Math.random() * 35));
                    d.setCancellationRate(0.02);
                    d.setChurnRisk(0.05);

                    driverRepository.save(d);
                }
            }
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

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("driver", driver);
        return ResponseEntity.ok(res);
    }
}
