package com.fleet.dispatch.controller;

import com.fleet.dispatch.model.Driver;
import com.fleet.dispatch.model.Order;
import com.fleet.dispatch.repository.DriverRepository;
import com.fleet.dispatch.repository.OrderRepository;
import com.fleet.dispatch.service.MLServiceClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private MLServiceClient mlServiceClient;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        List<Order> orders = orderRepository.findAll();
        List<Driver> drivers = driverRepository.findAll();

        double totalRevenue = orders.stream()
                .filter(o -> "completed".equalsIgnoreCase(o.getStatus()))
                .mapToDouble(Order::getPrice)
                .sum();

        long activeOrdersCount = orders.stream()
                .filter(o -> Arrays.asList("assigned", "picked_up", "out_for_delivery").contains(o.getStatus().toLowerCase()))
                .count();

        List<Order> completedOrders = orders.stream()
                .filter(o -> "completed".equalsIgnoreCase(o.getStatus()))
                .collect(Collectors.toList());

        List<Order> failedOrders = orders.stream()
                .filter(o -> "failed".equalsIgnoreCase(o.getStatus()))
                .collect(Collectors.toList());

        int totalCompleted = completedOrders.size();
        long compliantOrders = completedOrders.stream()
                .filter(o -> o.getRiskScore() != null && o.getRiskScore().getOverall() < 0.3)
                .count();

        int slaRate = totalCompleted > 0 ? (int) Math.round(((double) compliantOrders / totalCompleted) * 100.0) : 94;

        // Carbon emissions calculation (Bikes: 0.08 kg CO2/km, Cars: 0.21 kg, Trucks: 0.45 kg)
        Map<String, String> driverVehicleMap = drivers.stream()
                .collect(Collectors.toMap(Driver::getDriverId, Driver::getVehicleType, (a, b) -> a));

        double totalCarbon = 0.0;
        for (Order o : completedOrders) {
            String vType = driverVehicleMap.getOrDefault(o.getDriverId(), "bike");
            double factor = "truck".equalsIgnoreCase(vType) ? 0.45 : "car".equalsIgnoreCase(vType) ? 0.21 : 0.08;
            double estDistance = Math.max(1.0, (o.getPrice() - 50.0) / 12.0);
            totalCarbon += estDistance * factor;
        }

        // Leaderboard
        List<Map<String, Object>> leaderboard = drivers.stream()
                .sorted((a, b) -> Integer.compare(b.getCompletedDeliveries(), a.getCompletedDeliveries()))
                .limit(10)
                .map(d -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("driverId", d.getDriverId());
                    item.put("name", d.getName());
                    item.put("rating", d.getRating());
                    item.put("earnings", d.getEarnings());
                    item.put("completedDeliveries", d.getCompletedDeliveries());
                    item.put("churnRisk", d.getChurnRisk());
                    item.put("status", d.getStatus());
                    return item;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("totalRevenue", Math.round(totalRevenue * 100.0) / 100.0);
        result.put("activeOrders", activeOrdersCount);
        result.put("slaCompliance", slaRate);
        result.put("carbonEmissionsKg", Math.round(totalCarbon * 10.0) / 10.0);
        result.put("totalOrdersCount", orders.size());
        result.put("completedCount", totalCompleted);
        result.put("failedCount", failedOrders.size());
        result.put("driverLeaderboard", leaderboard);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/simulate")
    public ResponseEntity<?> runSimulation(@RequestBody Map<String, Object> body) {
        int additionalDrivers = body.get("additionalDrivers") != null ? Integer.parseInt(body.get("additionalDrivers").toString()) : 0;
        double demandIncreasePercent = body.get("demandIncreasePercent") != null ? Double.parseDouble(body.get("demandIncreasePercent").toString()) : 0.0;
        String zoneAlert = (String) body.getOrDefault("zoneAlert", "all");

        int currentDriversCount = (int) Math.max(1, driverRepository.countActiveDrivers());
        int currentOrdersCount = (int) Math.max(1, orderRepository.count());

        Map<String, Object> simResult = mlServiceClient.runSimulation(
                currentDriversCount,
                currentOrdersCount,
                additionalDrivers,
                demandIncreasePercent,
                zoneAlert
        );

        return ResponseEntity.ok(simResult);
    }
}
