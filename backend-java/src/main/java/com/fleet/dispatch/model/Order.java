package com.fleet.dispatch.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Order {
    private String orderId;
    private String customerName;
    private String customerPhone;
    private String businessCode = "ABC123"; // Unique Business Code (e.g. ABC123)
    private Location pickup;
    private Location drop;

    @JsonProperty("package")
    private PackageInfo packageInfo;

    private String priority = "medium";
    private DeliveryWindow deliveryWindow = new DeliveryWindow();
    private double price;
    private String status = "pending_quote"; // pending_quote, quoted, confirmed, dispatch_requested, assigned, picked_up, out_for_delivery, completed, rejected

    // Warehouse & Storage Service options
    private String warehouseId;
    private String warehouseName;
    private int storageDays = 0;
    private String storageType = "None"; // None, Ambient, Cold Storage, Pallet Staging, Bonded Yard, Cross-Docking
    private boolean requiresHandling = false;

    // Quotation & Billing Details
    private String quotationStatus = "pending_quote"; // pending_quote, quoted, accepted, rejected
    private BillingDetails billingDetails;

    // Dispatcher to Source Driver Request Flow
    private String dispatchRequestedDriverId;
    private String dispatchRequestedDriverName;
    private String dispatchStatus = "none"; // none, requested, accepted, declined

    private String driverId;
    private List<Location> routeCoordinates = new ArrayList<>();
    private double eta = 0.0;
    private RiskScore riskScore = new RiskScore();
    private String podPhotoUrl;
    private String podStatus; // pending, verified, rejected
    private Date createdAt = new Date();
    private Date updatedAt = new Date();

    public Order() {}

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public String getBusinessCode() {
        return businessCode;
    }

    public void setBusinessCode(String businessCode) {
        this.businessCode = businessCode;
    }

    public Location getPickup() {
        return pickup;
    }

    public void setPickup(Location pickup) {
        this.pickup = pickup;
    }

    public Location getDrop() {
        return drop;
    }

    public void setDrop(Location drop) {
        this.drop = drop;
    }

    public PackageInfo getPackageInfo() {
        return packageInfo;
    }

    public void setPackageInfo(PackageInfo packageInfo) {
        this.packageInfo = packageInfo;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public DeliveryWindow getDeliveryWindow() {
        return deliveryWindow;
    }

    public void setDeliveryWindow(DeliveryWindow deliveryWindow) {
        this.deliveryWindow = deliveryWindow;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getWarehouseId() {
        return warehouseId;
    }

    public void setWarehouseId(String warehouseId) {
        this.warehouseId = warehouseId;
    }

    public String getWarehouseName() {
        return warehouseName;
    }

    public void setWarehouseName(String warehouseName) {
        this.warehouseName = warehouseName;
    }

    public int getStorageDays() {
        return storageDays;
    }

    public void setStorageDays(int storageDays) {
        this.storageDays = storageDays;
    }

    public String getStorageType() {
        return storageType;
    }

    public void setStorageType(String storageType) {
        this.storageType = storageType;
    }

    public boolean isRequiresHandling() {
        return requiresHandling;
    }

    public void setRequiresHandling(boolean requiresHandling) {
        this.requiresHandling = requiresHandling;
    }

    public String getQuotationStatus() {
        return quotationStatus;
    }

    public void setQuotationStatus(String quotationStatus) {
        this.quotationStatus = quotationStatus;
    }

    public BillingDetails getBillingDetails() {
        return billingDetails;
    }

    public void setBillingDetails(BillingDetails billingDetails) {
        this.billingDetails = billingDetails;
    }

    public String getDispatchRequestedDriverId() {
        return dispatchRequestedDriverId;
    }

    public void setDispatchRequestedDriverId(String dispatchRequestedDriverId) {
        this.dispatchRequestedDriverId = dispatchRequestedDriverId;
    }

    public String getDispatchRequestedDriverName() {
        return dispatchRequestedDriverName;
    }

    public void setDispatchRequestedDriverName(String dispatchRequestedDriverName) {
        this.dispatchRequestedDriverName = dispatchRequestedDriverName;
    }

    public String getDispatchStatus() {
        return dispatchStatus;
    }

    public void setDispatchStatus(String dispatchStatus) {
        this.dispatchStatus = dispatchStatus;
    }

    public String getDriverId() {
        return driverId;
    }

    public void setDriverId(String driverId) {
        this.driverId = driverId;
    }

    public List<Location> getRouteCoordinates() {
        return routeCoordinates;
    }

    public void setRouteCoordinates(List<Location> routeCoordinates) {
        this.routeCoordinates = routeCoordinates;
    }

    public double getEta() {
        return eta;
    }

    public void setEta(double eta) {
        this.eta = eta;
    }

    public RiskScore getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(RiskScore riskScore) {
        this.riskScore = riskScore;
    }

    public String getPodPhotoUrl() {
        return podPhotoUrl;
    }

    public void setPodPhotoUrl(String podPhotoUrl) {
        this.podPhotoUrl = podPhotoUrl;
    }

    public String getPodStatus() {
        return podStatus;
    }

    public void setPodStatus(String podStatus) {
        this.podStatus = podStatus;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }
}
