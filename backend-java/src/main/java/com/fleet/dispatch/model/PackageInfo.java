package com.fleet.dispatch.model;

public class PackageInfo {
    private double weight;
    private String type;

    public PackageInfo() {}

    public PackageInfo(double weight, String type) {
        this.weight = weight;
        this.type = type;
    }

    public double getWeight() {
        return weight;
    }

    public void setWeight(double weight) {
        this.weight = weight;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
