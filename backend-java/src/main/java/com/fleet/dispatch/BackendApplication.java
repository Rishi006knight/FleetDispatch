package com.fleet.dispatch;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
        System.out.println("✓ Fleet Backend API Server (Java Spring Boot) is running on port 5000");
        System.out.println("✓ WebSocket / Real-time Event Broadcaster is ready");
    }
}
