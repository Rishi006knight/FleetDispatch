package com.fleet.dispatch.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "incidents")
public class Incident {
    @Id
    private String incidentId;
    private String orderId;
    private String driverId;
    private String type; // delay, theft, route_deviation, fraud_pod, breakdown
    private String severity = "medium"; // low, medium, high
    private String message;
    private String status = "open"; // open, resolved
    private Date timestamp = new Date();

    public Incident() {}

    public Incident(String incidentId, String orderId, String driverId, String type, String severity, String message) {
        this.incidentId = incidentId;
        this.orderId = orderId;
        this.driverId = driverId;
        this.type = type;
        this.severity = severity != null ? severity : "medium";
        this.message = message;
        this.status = "open";
        this.timestamp = new Date();
    }

    public String getIncidentId() {
        return incidentId;
    }

    public void setIncidentId(String incidentId) {
        this.incidentId = incidentId;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getDriverId() {
        return driverId;
    }

    public void setDriverId(String driverId) {
        this.driverId = driverId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Date getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Date timestamp) {
        this.timestamp = timestamp;
    }
}
