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
            driver.setDriverId("DRV-" + (int)(1000 + Math.random() * 9000));
        }
        storage.put(driver.getDriverId(), driver);
        return driver;
    }

    public List<Driver> saveAll(Iterable<Driver> drivers) {
        List<Driver> result = new ArrayList<>();
        for (Driver d : drivers) {
            result.add(save(d));
        }
        return result;
    }

    public Optional<Driver> findByDriverId(String driverId) {
        return Optional.ofNullable(storage.get(driverId));
    }

    public Optional<Driver> findById(String driverId) {
        return findByDriverId(driverId);
    }

    public List<Driver> findByStatus(String status) {
        return storage.values().stream()
                .filter(d -> status.equalsIgnoreCase(d.getStatus()))
                .collect(Collectors.toList());
    }

    public long countByStatusNot(String status) {
        return storage.values().stream()
                .filter(d -> !status.equalsIgnoreCase(d.getStatus()))
                .count();
    }

    public List<Driver> findAll() {
        return new ArrayList<>(storage.values());
    }

    public long count() {
        return storage.size();
    }

    public void deleteAll() {
        storage.clear();
    }
}
