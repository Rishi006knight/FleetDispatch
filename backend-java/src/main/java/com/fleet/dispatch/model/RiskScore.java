package com.fleet.dispatch.model;

public class RiskScore {
    private double delayProb;
    private double theftProb;
    private double failedProb;
    private double overall;

    public RiskScore() {
        this.delayProb = 0.05;
        this.theftProb = 0.02;
        this.failedProb = 0.01;
        this.overall = 0.03;
    }

    public RiskScore(double delayProb, double theftProb, double failedProb, double overall) {
        this.delayProb = delayProb;
        this.theftProb = theftProb;
        this.failedProb = failedProb;
        this.overall = overall;
    }

    public double getDelayProb() {
        return delayProb;
    }

    public void setDelayProb(double delayProb) {
        this.delayProb = delayProb;
    }

    public double getTheftProb() {
        return theftProb;
    }

    public void setTheftProb(double theftProb) {
        this.theftProb = theftProb;
    }

    public double getFailedProb() {
        return failedProb;
    }

    public void setFailedProb(double failedProb) {
        this.failedProb = failedProb;
    }

    public double getOverall() {
        return overall;
    }

    public void setOverall(double overall) {
        this.overall = overall;
    }
}
