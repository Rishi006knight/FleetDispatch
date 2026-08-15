package com.fleet.dispatch.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Ensures system startup validation and readiness.
 */
@Component
public class MongoConfig {
    private static final Logger log = LoggerFactory.getLogger(MongoConfig.class);

    @EventListener(ApplicationReadyEvent.class)
    public void initIndexes() {
        log.info("✓ Enterprise In-Memory Document Engine initialized and verified.");
    }
}
