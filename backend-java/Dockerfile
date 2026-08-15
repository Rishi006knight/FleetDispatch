# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper and pom first (layer cache for dependencies)
COPY pom.xml .

# Download dependencies (cached layer unless pom.xml changes)
RUN apk add --no-cache maven && mvn dependency:go-offline -B

# Copy source and build the fat JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S fleetapp && adduser -S fleetapp -G fleetapp

COPY --from=builder /app/target/dispatch-backend-1.0.0.jar app.jar

RUN chown fleetapp:fleetapp app.jar
USER fleetapp

# Cloud Run injects PORT env var — Spring Boot reads server.port from it
EXPOSE 8080
ENV SERVER_PORT=8080

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Dserver.port=${SERVER_PORT:-8080}", \
  "-jar", "app.jar"]
