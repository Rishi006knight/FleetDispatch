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
        // Only seed if the drivers collection is empty (preserves data across restarts)
        if (driverRepository.count() > 0) {
            return;
        }

        // Matrix of 16 Stations: RTO, Station Address, Lat, Lng, Driver Roster: [Driver Name, Assigned Truck Type]
        Object[][] stations = new Object[][]{
            {
                "01", "Rajaji Salai, Chennai Port", 13.0844, 80.2936,
                new String[][]{
                    {"Murugan", "32ft Heavy Trailer"},
                    {"Kaliyaperumal", "40ft Container Freightliner"},
                    {"Soundararajan", "20ft Multi-Axle Truck"},
                    {"Thangaraj", "32ft Heavy Trailer"}
                }
            },
            {
                "02", "Kamarajar Port Road, Ennore", 13.2611, 80.3314,
                new String[][]{
                    {"Shanmugam", "40ft Container Freightliner"},
                    {"Sundaram", "32ft Heavy Trailer"},
                    {"Kathirvel", "40ft Container Freightliner"}
                }
            },
            {
                "04", "Wholesale Market Road, Koyambedu", 13.0692, 80.1948,
                new String[][]{
                    {"Ganesan", "20ft Multi-Axle Truck"},
                    {"Venkatesan", "Refrigerated Reefer Truck"},
                    {"Alagappan", "14ft Eicher Container"}
                }
            },
            {
                "22", "GST Road, Tambaram, Chennai", 12.9249, 80.1000,
                new String[][]{
                    {"Mani", "14ft Eicher Container"},
                    {"Dharmalingam", "20ft Multi-Axle Truck"},
                    {"Boopathi", "32ft Heavy Trailer"}
                }
            },
            {
                "38", "Peelamedu Avinashi Road, Coimbatore", 11.0168, 76.9558,
                new String[][]{
                    {"Senthil Kumar", "Refrigerated Reefer Truck"},
                    {"Ranganathan", "20ft Multi-Axle Truck"},
                    {"Muthukumar", "32ft Heavy Trailer"},
                    {"Karuppusamy", "Refrigerated Reefer Truck"}
                }
            },
            {
                "58", "Kappalur Ring Road, Madurai", 9.9252, 78.1198,
                new String[][]{
                    {"Arumugam", "20ft Multi-Axle Truck"},
                    {"Pandian", "32ft Heavy Trailer"},
                    {"Jeyachandran", "Refrigerated Reefer Truck"}
                }
            },
            {
                "45", "Central Corridor, Tiruchirappalli", 10.7905, 78.7047,
                new String[][]{
                    {"Ramasamy", "32ft Heavy Trailer"},
                    {"Balakrishnan", "20ft Multi-Axle Truck"},
                    {"Anbazhagan", "40ft Container Freightliner"}
                }
            },
            {
                "27", "Steel Plant Road, Salem", 11.6643, 78.1460,
                new String[][]{
                    {"Karthik Raja", "14ft Eicher Container"},
                    {"Selvaraj", "20ft Multi-Axle Truck"},
                    {"Gunasekaran", "32ft Heavy Trailer"}
                }
            },
            {
                "72", "Gangaikondan SIPCOT, Tirunelveli", 8.7139, 77.7567,
                new String[][]{
                    {"Muthu", "20ft Multi-Axle Truck"},
                    {"Ayyappan", "32ft Heavy Trailer"},
                    {"Balamurugan", "14ft Eicher Container"}
                }
            },
            {
                "23", "Ranipet SIPCOT, Vellore", 12.9165, 79.1325,
                new String[][]{
                    {"Perumal", "32ft Heavy Trailer"},
                    {"Saravanan", "20ft Multi-Axle Truck"},
                    {"Rajendran", "14ft Eicher Container"}
                }
            },
            {
                "39", "Netaji Apparel Park, Tiruppur", 11.1085, 77.3411,
                new String[][]{
                    {"Sakthivel", "20ft Multi-Axle Truck"},
                    {"Chinnasamy", "14ft Eicher Container"},
                    {"Govindasamy", "32ft Heavy Trailer"}
                }
            },
            {
                "33", "Perundurai SIPCOT, Erode", 11.3410, 77.7172,
                new String[][]{
                    {"Palanisamy", "Refrigerated Reefer Truck"},
                    {"Narayanan", "20ft Multi-Axle Truck"},
                    {"Ravichandran", "14ft Eicher Container"}
                }
            },
            {
                "69", "Harbour Estate CFS, Thoothukudi", 8.7642, 78.1348,
                new String[][]{
                    {"Velu Pandian", "40ft Container Freightliner"},
                    {"Subramanian", "32ft Heavy Trailer"},
                    {"Chelladurai", "20ft Multi-Axle Truck"}
                }
            },
            {
                "49", "Pillaiyarpatti Delta Terminal, Thanjavur", 10.7870, 79.1378,
                new String[][]{
                    {"Manickam", "14ft Eicher Container"},
                    {"Elangovan", "20ft Multi-Axle Truck"},
                    {"Selvam", "Refrigerated Reefer Truck"}
                }
            },
            {
                "70", "SIPCOT Phase-II, Hosur", 12.7409, 77.8253,
                new String[][]{
                    {"Dhandapani", "32ft Heavy Trailer"},
                    {"Thirunavukkarasu", "20ft Multi-Axle Truck"},
                    {"Sivakumar", "32ft Heavy Trailer"}
                }
            },
            {
                "74", "Kanyakumari Highway, Nagercoil", 8.1833, 77.4119,
                new String[][]{
                    {"Vijayakumar", "20ft Multi-Axle Truck"},
                    {"Ponraj", "14ft Eicher Container"},
                    {"Kannan", "Refrigerated Reefer Truck"}
                }
            }
        };

        for (Object[] station : stations) {
            String rto = (String) station[0];
            String address = (String) station[1];
            double lat = (Double) station[2];
            double lng = (Double) station[3];
            String[][] driverRoster = (String[][]) station[4];

            for (int i = 0; i < driverRoster.length; i++) {
                int driverNum = 1001 + i;
                String personName = driverRoster[i][0];
                String truckType = driverRoster[i][1];
                String username = "TN-" + rto + "-" + driverNum;
                String driverId = "TRK-" + rto + "-" + driverNum;
                String vehicleId = "TN-" + rto + "-TR-" + driverNum;
                
                // Exact Format: Name(address-username)
                String formattedDriverName = personName + " (" + address + " - " + username + ")";

                Driver d = new Driver();
                d.setDriverId(driverId);
                d.setName(formattedDriverName);
                d.setPhone("9840" + rto + driverNum);
                d.setVehicleId(vehicleId);
                d.setVehicleType(truckType);
                d.setStatus("online");
                
                // Slight offset for visual map separation around hub
                double jitterLat = (Math.random() - 0.5) * 0.005;
                double jitterLng = (Math.random() - 0.5) * 0.005;
                d.setCurrentLocation(new Location(lat + jitterLat, lng + jitterLng, address));
                d.setRating(Math.round((4.85 + Math.random() * 0.14) * 100.0) / 100.0);
                d.setReliability(Math.round((0.95 + Math.random() * 0.04) * 100.0) / 100.0);
                d.setEarnings(Math.round((35000.0 + Math.random() * 25000.0) * 100.0) / 100.0);
                d.setCompletedDeliveries((int)(42 + Math.random() * 35));
                d.setCancellationRate(0.01);
                d.setChurnRisk(0.04);

                driverRepository.save(d);
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
