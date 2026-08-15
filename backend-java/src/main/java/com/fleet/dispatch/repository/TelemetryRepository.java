package com.fleet.dispatch.repository;

import com.fleet.dispatch.model.Telemetry;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class TelemetryRepository {
    private final List<Telemetry> logs = Collections.synchronizedList(new ArrayList<>());

    public Telemetry save(Telemetry telemetry) {
        if (telemetry.getId() == null || telemetry.getId().isEmpty()) {
            telemetry.setId(UUID.randomUUID().toString());
        }
        logs.add(telemetry);
        return telemetry;
    }

    public List<Telemetry> findByDriverId(String driverId) {
        synchronized (logs) {
            return logs.stream()
                    .filter(t -> driverId != null && driverId.equals(t.getDriverId()))
                    .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                    .collect(Collectors.toList());
        }
    }
}
