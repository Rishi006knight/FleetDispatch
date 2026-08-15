package com.fleet.dispatch.model;

public class DeliveryWindow {
    private String start;
    private String end;

    public DeliveryWindow() {
        this.start = "12:00";
        this.end = "18:00";
    }

    public DeliveryWindow(String start, String end) {
        this.start = start;
        this.end = end;
    }

    public String getStart() {
        return start;
    }

    public void setStart(String start) {
        this.start = start;
    }

    public String getEnd() {
        return end;
    }

    public void setEnd(String end) {
        this.end = end;
    }
}
