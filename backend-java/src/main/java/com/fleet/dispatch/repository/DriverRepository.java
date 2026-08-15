package com.fleet.dispatch.repository;

import com.fleet.dispatch.model.Driver;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends MongoRepository<Driver, String> {

    /** Lookup by business-key (same as findById since driverId is @Id) */
    Optional<Driver> findByDriverId(String driverId);

    /** Filter drivers by status field (e.g. "online", "offline", "busy") */
    List<Driver> findByStatus(String status);

    /** Count all drivers that are NOT offline — replaces countActiveDrivers() */
    long countByStatusNot(String status);
}
