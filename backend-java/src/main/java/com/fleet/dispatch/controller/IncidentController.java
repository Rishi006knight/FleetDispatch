package com.fleet.dispatch.controller;

import com.fleet.dispatch.model.Incident;
import com.fleet.dispatch.repository.IncidentRepository;
import com.fleet.dispatch.websocket.SocketIOService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "*")
public class IncidentController {

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private SocketIOService socketIOService;

    @GetMapping
    public ResponseEntity<List<Incident>> getIncidents() {
        return ResponseEntity.ok(incidentRepository.findAllByOrderByTimestampDesc());
    }

    @PostMapping
    public ResponseEntity<?> createIncident(@RequestBody Map<String, String> body) {
        String type = body.get("type");
        String message = body.get("message");

        if (type == null || message == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Type and message are required."));
        }

        String incidentId = "INC-" + (int)(100000 + Math.random() * 900000);
        Incident incident = new Incident(
                incidentId,
                body.get("orderId"),
                body.get("driverId"),
                type,
                body.getOrDefault("severity", "medium"),
                message
        );

        Incident saved = incidentRepository.save(incident);
        socketIOService.emit("INCIDENT_CREATED", saved);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{incidentId}/resolve")
    public ResponseEntity<?> resolveIncident(@PathVariable String incidentId) {
        Optional<Incident> incOpt = incidentRepository.findByIncidentId(incidentId);
        if (incOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Incident not found."));
        }

        Incident inc = incOpt.get();
        inc.setStatus("resolved");
        Incident saved = incidentRepository.save(inc);

        socketIOService.emit("INCIDENT_RESOLVED", saved);
        return ResponseEntity.ok(saved);
    }
}
