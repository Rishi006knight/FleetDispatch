package com.fleet.dispatch.repository;

import com.fleet.dispatch.model.Telemetry;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class TelemetryRepository {
    private final Map<String, Telemetry> storage = new ConcurrentHashMap<>();

    public Telemetry save(Telemetry telemetry) {
        if (telemetry.getId() == null || telemetry.getId().isEmpty()) {
            telemetry.setId("TEL-" + (int)(100000 + Math.random() * 900000));
        }
        if (telemetry.getTimestamp() == null) {
            telemetry.setTimestamp(new Date());
        }
        storage.put(telemetry.getId(), telemetry);
        return telemetry;
    }

    public List<Telemetry> saveAll(Iterable<Telemetry> list) {
        List<Telemetry> result = new ArrayList<>();
        for (Telemetry t : list) {
            result.add(save(t));
        }
        return result;
    }

    public List<Telemetry> findByDriverIdOrderByTimestampDesc(String driverId) {
        return storage.values().stream()
                .filter(t -> driverId.equals(t.getDriverId()))
                .sorted((a, b) -> {
                    if (a.getTimestamp() == null || b.getTimestamp() == null) return 0;
                    return b.getTimestamp().compareTo(a.getTimestamp());
                })
                .collect(Collectors.toList());
    }

    public List<Telemetry> findAll() {
        return new ArrayList<>(storage.values());
    }

    public long count() {
        return storage.size();
    }

    public void deleteAll() {
        storage.clear();
    }
}
