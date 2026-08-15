package com.fleet.dispatch.repository;

import com.fleet.dispatch.model.Order;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class OrderRepository {
    private final Map<String, Order> storage = new ConcurrentHashMap<>();

    public Order save(Order order) {
        if (order.getOrderId() == null || order.getOrderId().isEmpty()) {
            order.setOrderId("ORD-" + (int)(100000 + Math.random() * 900000));
        }
        order.setUpdatedAt(new Date());
        if (order.getCreatedAt() == null) {
            order.setCreatedAt(new Date());
        }
        storage.put(order.getOrderId(), order);
        return order;
    }

    public List<Order> saveAll(Iterable<Order> orders) {
        List<Order> result = new ArrayList<>();
        for (Order o : orders) {
            result.add(save(o));
        }
        return result;
    }

    public Optional<Order> findByOrderId(String orderId) {
        return Optional.ofNullable(storage.get(orderId));
    }

    public Optional<Order> findById(String orderId) {
        return findByOrderId(orderId);
    }

    public List<Order> findAll() {
        return storage.values().stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .collect(Collectors.toList());
    }

    public List<Order> findAllByOrderByCreatedAtDesc() {
        return findAll();
    }

    public List<Order> findByDriverId(String driverId) {
        return storage.values().stream()
                .filter(o -> driverId.equals(o.getDriverId()))
                .collect(Collectors.toList());
    }

    public long count() {
        return storage.size();
    }

    public void deleteAll() {
        storage.clear();
    }
}
