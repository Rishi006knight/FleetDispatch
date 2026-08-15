package com.fleet.dispatch.repository;

import com.fleet.dispatch.model.Driver;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class DriverRepository {
    private final Map<String, Driver> storage = new ConcurrentHashMap<>();

    public Driver save(Driver driver) {
        if (driver.getDriverId() == null || driver.getDriverId().isEmpty()) {
            driver.setDriverId("DRV-" + (int)(100 + Math.random() * 900));
        }
        driver.setUpdatedAt(new Date());
        storage.put(driver.getDriverId(), driver);
        return driver;
    }

    public Optional<Driver> findByDriverId(String driverId) {
        return Optional.ofNullable(storage.get(driverId));
    }

    public List<Driver> findAll() {
        return new ArrayList<>(storage.values());
    }

    public List<Driver> findByStatus(String status) {
        return storage.values().stream()
                .filter(d -> status.equalsIgnoreCase(d.getStatus()))
                .collect(Collectors.toList());
    }

    public long countActiveDrivers() {
        return storage.values().stream()
                .filter(d -> !"offline".equalsIgnoreCase(d.getStatus()))
                .count();
    }

    public long count() {
        return storage.size();
    }
}
