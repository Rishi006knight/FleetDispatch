package com.fleet.dispatch.config;

import com.mongodb.client.MongoClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.stereotype.Component;

/**
 * Ensures indexes are created on startup for query-critical fields.
 * Runs after the application is fully started to avoid circular bean issues.
 */
@Component
public class MongoConfig {

    private static final Logger log = LoggerFactory.getLogger(MongoConfig.class);

    @Autowired
    private MongoTemplate mongoTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void initIndexes() {
        try {
            // drivers: index on status for findByStatus() and countByStatusNot()
            IndexOperations driverIdx = mongoTemplate.indexOps("drivers");
            driverIdx.ensureIndex(new Index().on("status", Sort.Direction.ASC));

            // orders: index on driverId for findByDriverId(), createdAt for sort
            IndexOperations orderIdx = mongoTemplate.indexOps("orders");
            orderIdx.ensureIndex(new Index().on("driverId", Sort.Direction.ASC));
            orderIdx.ensureIndex(new Index().on("createdAt", Sort.Direction.DESC));

            // incidents: compound index on orderId + type + status for findOpenIncident()
            IndexOperations incidentIdx = mongoTemplate.indexOps("incidents");
            incidentIdx.ensureIndex(new Index()
                    .on("orderId", Sort.Direction.ASC)
                    .on("type", Sort.Direction.ASC)
                    .on("status", Sort.Direction.ASC));
            incidentIdx.ensureIndex(new Index().on("timestamp", Sort.Direction.DESC));

            // telemetry: index on driverId + timestamp for findByDriverIdOrderByTimestampDesc()
            IndexOperations telemetryIdx = mongoTemplate.indexOps("telemetry");
            telemetryIdx.ensureIndex(new Index()
                    .on("driverId", Sort.Direction.ASC)
                    .on("timestamp", Sort.Direction.DESC));

            log.info("✓ MongoDB indexes verified for all collections.");
        } catch (Exception e) {
            log.warn("⚠ Could not create MongoDB indexes (non-fatal): {}", e.getMessage());
        }
    }
}
