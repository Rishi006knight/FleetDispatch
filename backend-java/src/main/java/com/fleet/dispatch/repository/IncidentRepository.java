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
        if (incident.getTimestamp() == null) {
            incident.setTimestamp(new Date());
        }
        storage.put(incident.getIncidentId(), incident);
        return incident;
    }

    public List<Incident> saveAll(Iterable<Incident> incidents) {
        List<Incident> result = new ArrayList<>();
        for (Incident inc : incidents) {
            result.add(save(inc));
        }
        return result;
    }

    public Optional<Incident> findByIncidentId(String incidentId) {
        return Optional.ofNullable(storage.get(incidentId));
    }

    public Optional<Incident> findById(String incidentId) {
        return findByIncidentId(incidentId);
    }

    public List<Incident> findAll() {
        return storage.values().stream()
                .sorted((a, b) -> {
                    if (a.getTimestamp() == null || b.getTimestamp() == null) return 0;
                    return b.getTimestamp().compareTo(a.getTimestamp());
                })
                .collect(Collectors.toList());
    }

    public List<Incident> findAllByOrderByTimestampDesc() {
        return findAll();
    }

    public Optional<Incident> findOpenIncident(String orderId, String type) {
        return storage.values().stream()
                .filter(i -> orderId.equals(i.getOrderId()) && type.equals(i.getType()) && "open".equalsIgnoreCase(i.getStatus()))
                .findFirst();
    }

    public long count() {
        return storage.size();
    }

    public void deleteAll() {
        storage.clear();
    }
}
