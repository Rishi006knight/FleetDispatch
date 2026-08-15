package com.fleet.dispatch.model;

public class BillingDetails {
    private double freightBase;
    private double weightSurcharge;
    private double storageFee;
    private double handlingFee;
    private double tollSurcharge;
    private double gstAmount;
    private double totalAmount;
    private String notes;

    public BillingDetails() {}

    public BillingDetails(double freightBase, double weightSurcharge, double storageFee, double handlingFee, double tollSurcharge) {
        this.freightBase = freightBase;
        this.weightSurcharge = weightSurcharge;
        this.storageFee = storageFee;
        this.handlingFee = handlingFee;
        this.tollSurcharge = tollSurcharge;
        
        double subtotal = freightBase + weightSurcharge + storageFee + handlingFee + tollSurcharge;
        this.gstAmount = Math.round(subtotal * 0.18 * 100.0) / 100.0; // 18% GST on commercial freight & warehousing
        this.totalAmount = Math.round((subtotal + this.gstAmount) * 100.0) / 100.0;
    }

    public double getFreightBase() {
        return freightBase;
    }

    public void setFreightBase(double freightBase) {
        this.freightBase = freightBase;
    }

    public double getWeightSurcharge() {
        return weightSurcharge;
    }

    public void setWeightSurcharge(double weightSurcharge) {
        this.weightSurcharge = weightSurcharge;
    }

    public double getStorageFee() {
        return storageFee;
    }

    public void setStorageFee(double storageFee) {
        this.storageFee = storageFee;
    }

    public double getHandlingFee() {
        return handlingFee;
    }

    public void setHandlingFee(double handlingFee) {
        this.handlingFee = handlingFee;
    }

    public double getTollSurcharge() {
        return tollSurcharge;
    }

    public void setTollSurcharge(double tollSurcharge) {
        this.tollSurcharge = tollSurcharge;
    }

    public double getGstAmount() {
        return gstAmount;
    }

    public void setGstAmount(double gstAmount) {
        this.gstAmount = gstAmount;
    }

    public double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
