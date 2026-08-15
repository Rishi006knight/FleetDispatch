package com.fleet.dispatch.repository;

import com.fleet.dispatch.model.Telemetry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TelemetryRepository extends MongoRepository<Telemetry, String> {

    /** All telemetry events for a driver, newest first */
    List<Telemetry> findByDriverIdOrderByTimestampDesc(String driverId);
}
