package com.fleet.dispatch.repository;

import com.fleet.dispatch.model.Order;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends MongoRepository<Order, String> {

    /** Lookup by business-key (same as findById since orderId is @Id) */
    Optional<Order> findByOrderId(String orderId);

    /** All orders for a specific driver */
    List<Order> findByDriverId(String driverId);

    /** All orders sorted by createdAt descending — replaces the hand-rolled sorted findAll() */
    List<Order> findAllByOrderByCreatedAtDesc();
}
