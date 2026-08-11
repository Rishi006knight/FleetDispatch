import { Request, Response } from 'express';
import Driver from '../models/Driver.js';
import Order from '../models/Order.js';
import Telemetry from '../models/Telemetry.js';
import Incident from '../models/Incident.js';
import axios from 'axios';
import { Server as SocketServer } from 'socket.io';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export class DriverController {
  private io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }

  // Register a new driver
  registerDriver = async (req: Request, res: Response) => {
    try {
      const { name, phone, vehicleId, vehicleType, initialLat, initialLng } = req.body;

      if (!name || !phone || !vehicleId) {
        return res.status(400).json({ error: 'Missing required driver fields.' });
      }

      const driverId = 'DRV-' + Math.floor(100 + Math.random() * 900);

      const newDriver = new Driver({
        driverId,
        name,
        phone,
        vehicleId,
        vehicleType: vehicleType || 'bike',
        status: 'offline',
        currentLocation: {
          lat: initialLat || 19.0760, // Default Mumbai
          lng: initialLng || 72.8777
        },
        rating: 4.8 + Math.random() * 0.2, // Random starting rating
        reliability: 0.9 + Math.random() * 0.1,
        churnRisk: 0.05 + Math.random() * 0.1
      });

      await newDriver.save();
      this.io.emit('DRIVER_UPDATED', newDriver);

      res.status(201).json(newDriver);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Get all drivers
  getDrivers = async (req: Request, res: Response) => {
    try {
      const drivers = await Driver.find();
      res.json(drivers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Update online status
  toggleStatus = async (req: Request, res: Response) => {
    try {
      const { driverId } = req.params;
      const { status } = req.body; // 'online' | 'offline'

      const driver = await Driver.findOne({ driverId });
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found.' });
      }

      driver.status = status;
      await driver.save();

      this.io.emit('DRIVER_UPDATED', driver);
      res.json(driver);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Ingest telemetry / GPS update
  updateLocation = async (req: Request, res: Response) => {
    try {
      const { driverId } = req.params;
      const { lat, lng, speed, heading, activeOrderId } = req.body;

      const driver = await Driver.findOne({ driverId });
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found.' });
      }

      driver.currentLocation = { lat, lng };
      await driver.save();

      // Log to telemetry database (time-series)
      const telemetryLog = new Telemetry({
        driverId,
        orderId: activeOrderId || null,
        location: { lat, lng },
        speed: speed || 0,
        heading: heading || 0
      });
      await telemetryLog.save();

      // Broadcast GPS update
      this.io.emit('TELEMETRY_UPDATED', {
        driverId,
        location: { lat, lng },
        speed,
        heading,
        activeOrderId
      });

      // If driver is busy delivering, check for route deviations
      if (activeOrderId) {
        const order = await Order.findOne({ orderId: activeOrderId });
        if (order && order.status === 'out_for_delivery') {
          try {
            // Check route anomaly with ML service
            const deviationRes = await axios.post(`${ML_URL}/api/detect-deviation`, {
              current_lat: lat,
              current_lng: lng,
              route: order.routeCoordinates
            });

            if (deviationRes.data.deviated) {
              const distanceDeviated = Math.round(deviationRes.data.distance_meters);
              
              // Only alert if we don't have an active open deviation incident for this order
              const existingIncident = await Incident.findOne({ 
                orderId: activeOrderId, 
                type: 'route_deviation', 
                status: 'open' 
              });

              if (!existingIncident) {
                const incidentId = 'INC-' + Math.floor(100000 + Math.random() * 900000);
                const newIncident = new Incident({
                  incidentId,
                  orderId: activeOrderId,
                  driverId,
                  type: 'route_deviation',
                  severity: 'medium',
                  message: `Route Deviation Detected: Driver is ${distanceDeviated} meters off the optimized path!`,
                  status: 'open'
                });
                await newIncident.save();
                this.io.emit('INCIDENT_CREATED', newIncident);
              }
            }
          } catch (err) {
            // ML anomaly check failed or offline
          }
        }
      }

      // Periodically update churn predictions if driver attributes trigger it
      try {
        if (Math.random() < 0.1) { // 10% chance on GPS update to simulate continuous driver scoring
          const churnRes = await axios.post(`${ML_URL}/api/predict-churn`, {
            cancellation_rate: driver.cancellationRate,
            rating: driver.rating,
            completed_deliveries: driver.completedDeliveries,
            earnings: driver.earnings
          });

          if (churnRes.data.churn_probability !== undefined) {
            const oldRisk = driver.churnRisk;
            driver.churnRisk = churnRes.data.churn_probability;
            await driver.save();

            if (driver.churnRisk > 0.7 && oldRisk <= 0.7) {
              // Generate alert for dispatcher
              const incidentId = 'INC-' + Math.floor(100000 + Math.random() * 900000);
              const churnIncident = new Incident({
                incidentId,
                driverId,
                type: 'delay', // or general alert type
                severity: 'medium',
                message: `High Churn Risk: Driver ${driver.name} has a ${Math.round(driver.churnRisk * 100)}% chance of leaving the platform within 30 days. Recommend retention bonus.`,
                status: 'open'
              });
              await churnIncident.save();
              this.io.emit('INCIDENT_CREATED', churnIncident);
            }

            this.io.emit('DRIVER_UPDATED', driver);
          }
        }
      } catch (err) {
        // Churn predictor down
      }

      res.json({ success: true, driver });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
