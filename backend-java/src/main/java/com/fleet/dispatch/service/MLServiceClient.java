package com.fleet.dispatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fleet.dispatch.model.Location;
import com.fleet.dispatch.model.RiskScore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class MLServiceClient {
    private static final Logger logger = LoggerFactory.getLogger(MLServiceClient.class);

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public double predictPrice(double distance, String priority, String packageType, String weather, String traffic, int hour) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("distance", distance);
            req.put("priority", priority);
            req.put("package_type", packageType);
            req.put("weather", weather != null ? weather : "clear");
            req.put("traffic", traffic != null ? traffic : "normal");
            req.put("hour", hour);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(req, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(mlServiceUrl + "/api/predict-price", entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                return root.path("price").asDouble();
            }
        } catch (Exception e) {
            logger.warn("Python ML Service Dynamic Pricing call failed: {}. Using fallback calculation.", e.getMessage());
        }
        // Fallback
        return Math.round(50.0 + distance * 12.0 + ("high".equalsIgnoreCase(priority) ? 35.0 : 0.0));
    }

    public RiskScore predictRisk(double distance, String priority, double packageWeight, double driverRating, double driverReliability, String weather) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("distance", distance);
            req.put("priority", priority);
            req.put("package_weight", packageWeight);
            req.put("driver_rating", driverRating);
            req.put("driver_reliability", driverReliability);
            req.put("weather", weather != null ? weather : "clear");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(req, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(mlServiceUrl + "/api/predict-risk", entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode riskNode = root.path("risk");
                return new RiskScore(
                        riskNode.path("delayProb").asDouble(0.05),
                        riskNode.path("theftProb").asDouble(0.02),
                        riskNode.path("failedProb").asDouble(0.01),
                        riskNode.path("overall").asDouble(0.03)
                );
            }
        } catch (Exception e) {
            logger.warn("Python ML Service Risk Prediction call failed: {}. Using fallback.", e.getMessage());
        }
        return new RiskScore(0.08, 0.03, 0.02, 0.05);
    }

    public Map<String, Object> optimizeRoute(Location driverLoc, Location pickup, Location drop) {
        Map<String, Object> result = new HashMap<>();
        try {
            Map<String, Object> req = new HashMap<>();
            Map<String, Object> dLoc = new HashMap<>();
            dLoc.put("lat", driverLoc.getLat());
            dLoc.put("lng", driverLoc.getLng());

            Map<String, Object> pLoc = new HashMap<>();
            pLoc.put("lat", pickup.getLat());
            pLoc.put("lng", pickup.getLng());

            Map<String, Object> drLoc = new HashMap<>();
            drLoc.put("lat", drop.getLat());
            drLoc.put("lng", drop.getLng());

            req.put("driver_location", dLoc);
            req.put("pickup", pLoc);
            req.put("drop", drLoc);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(req, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(mlServiceUrl + "/api/optimize-route", entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                List<Location> waypoints = new ArrayList<>();
                JsonNode routeNode = root.path("route");
                if (routeNode.isArray()) {
                    for (JsonNode pt : routeNode) {
                        waypoints.add(new Location(pt.path("lat").asDouble(), pt.path("lng").asDouble()));
                    }
                }
                result.put("route", waypoints);
                result.put("total_eta_minutes", root.path("total_eta_minutes").asDouble(15.0));
                result.put("total_distance_km", root.path("total_distance_km").asDouble(5.0));
                return result;
            }
        } catch (Exception e) {
            logger.warn("Python ML Service Route Optimization call failed: {}. Using fallback straight route.", e.getMessage());
        }

        List<Location> fallbackRoute = Arrays.asList(pickup, drop);
        result.put("route", fallbackRoute);
        result.put("total_eta_minutes", 15.0);
        result.put("total_distance_km", 5.0);
        return result;
    }

    public Double predictChurn(double cancellationRate, double rating, int completedDeliveries, double earnings) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("cancellation_rate", cancellationRate);
            req.put("rating", rating);
            req.put("completed_deliveries", completedDeliveries);
            req.put("earnings", earnings);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(req, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(mlServiceUrl + "/api/predict-churn", entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                return root.path("churn_probability").asDouble();
            }
        } catch (Exception e) {
            logger.warn("Python ML Service Churn prediction failed: {}", e.getMessage());
        }
        return null;
    }

    public Map<String, Object> detectDeviation(double currentLat, double currentLng, List<Location> route) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("current_lat", currentLat);
            req.put("current_lng", currentLng);
            
            List<Map<String, Double>> routeList = new ArrayList<>();
            for (Location loc : route) {
                Map<String, Double> pt = new HashMap<>();
                pt.put("lat", loc.getLat());
                pt.put("lng", loc.getLng());
                routeList.add(pt);
            }
            req.put("route", routeList);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(req, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(mlServiceUrl + "/api/detect-deviation", entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                Map<String, Object> map = new HashMap<>();
                map.put("deviated", root.path("deviated").asBoolean(false));
                map.put("distance_meters", root.path("distance_meters").asDouble(0.0));
                return map;
            }
        } catch (Exception e) {
            logger.warn("Python ML Service Deviation check failed: {}", e.getMessage());
        }
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("deviated", false);
        fallback.put("distance_meters", 0.0);
        return fallback;
    }

    public Map<String, Object> verifyPOD(String photoBase64, double driverLat, double driverLng, double dropLat, double dropLng) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("photo_base64", photoBase64);
            req.put("driver_lat", driverLat);
            req.put("driver_lng", driverLng);
            req.put("drop_lat", dropLat);
            req.put("drop_lng", dropLng);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(req, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(mlServiceUrl + "/api/verify-pod", entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                Map<String, Object> map = new HashMap<>();
                map.put("passed", root.path("passed").asBoolean(true));
                map.put("message", root.path("message").asText("Verified"));
                map.put("confidence_score", root.path("confidence_score").asDouble(0.95));
                return map;
            }
        } catch (Exception e) {
            logger.warn("Python ML Service POD Verification failed: {}", e.getMessage());
        }
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("passed", true);
        fallback.put("message", "Auto-verified via fallback.");
        fallback.put("confidence_score", 0.90);
        return fallback;
    }

    public Map<String, Object> runSimulation(int currentDrivers, int currentOrders, int additionalDrivers, double demandIncreasePercent, String zone) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("current_drivers", currentDrivers);
            req.put("current_orders", currentOrders);
            req.put("additional_drivers", additionalDrivers);
            req.put("demand_increase_percent", demandIncreasePercent);
            req.put("zone", zone != null ? zone : "all");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(req, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(mlServiceUrl + "/api/simulate", entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return objectMapper.readValue(response.getBody(), Map.class);
            }
        } catch (Exception e) {
            logger.warn("Python ML Service Simulation failed: {}. Using analytical estimation.", e.getMessage());
        }
        // Fallback analytical calculation
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("required_vehicles", Math.round(currentDrivers * (1 + demandIncreasePercent / 100.0)));
        fallback.put("expected_sla_percent", Math.max(60, Math.round(94 - demandIncreasePercent * 0.4 + additionalDrivers * 1.5)));
        fallback.put("additional_drivers_required", Math.max(0, Math.round(demandIncreasePercent * 0.3 - additionalDrivers)));
        fallback.put("estimated_revenue_increase", Math.round(demandIncreasePercent * 450));
        fallback.put("message", "Local analytical simulation computed.");
        return fallback;
    }
}
