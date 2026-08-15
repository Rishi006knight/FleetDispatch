package com.fleet.dispatch.repository;

import com.fleet.dispatch.model.Incident;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class IncidentRepository {
    private final Map<String, Incident> storage = new ConcurrentHashMap<>();

    public Incident save(Incident incident) {
        if (incident.getIncidentId() == null || incident.getIncidentId().isEmpty()) {
            incident.setIncidentId("INC-" + (int)(100000 + Math.random() * 900000));
        }
        storage.put(incident.getIncidentId(), incident);
        return incident;
    }

    public Optional<Incident> findByIncidentId(String incidentId) {
        return Optional.ofNullable(storage.get(incidentId));
    }

    public Optional<Incident> findOpenIncident(String orderId, String type) {
        return storage.values().stream()
                .filter(i -> orderId != null && orderId.equals(i.getOrderId()) 
                        && type != null && type.equalsIgnoreCase(i.getType()) 
                        && "open".equalsIgnoreCase(i.getStatus()))
                .findFirst();
    }

    public List<Incident> findAll() {
        return storage.values().stream()
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .collect(Collectors.toList());
    }
}
