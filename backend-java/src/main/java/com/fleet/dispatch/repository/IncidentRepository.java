package com.fleet.dispatch.repository;

import com.fleet.dispatch.model.Incident;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentRepository extends MongoRepository<Incident, String> {

    /** Lookup by business-key (same as findById since incidentId is @Id) */
    Optional<Incident> findByIncidentId(String incidentId);

    /** All incidents sorted by timestamp descending — replaces the hand-rolled sorted findAll() */
    List<Incident> findAllByOrderByTimestampDesc();

    /** Find an open incident matching orderId + type — replaces the stream().filter() logic */
    @Query("{ 'orderId': ?0, 'type': ?1, 'status': 'open' }")
    Optional<Incident> findOpenIncident(String orderId, String type);
}
