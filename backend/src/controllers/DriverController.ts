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

  // Register a new driver or update existing station driver
  registerDriver = async (req: Request, res: Response) => {
    try {
      const { 
        name, 
        phone, 
        vehicleId, 
        vehicleType, 
        initialLat, 
        initialLng, 
        stationHub, 
        rtoCode 
      } = req.body;

      if (!name || !vehicleId) {
        return res.status(400).json({ error: 'Missing required driver fields (name, vehicleId).' });
      }

      // Check if driver already exists with this vehicleId
      let driver = await Driver.findOne({ vehicleId });
      if (driver) {
        driver.status = 'online';
        if (initialLat && initialLng) {
          driver.currentLocation = { lat: initialLat, lng: initialLng };
        }
        await driver.save();
        this.io.emit('DRIVER_UPDATED', driver);
        return res.json(driver);
      }

      // Generate driverId if not present
      const driverId = 'TRK-' + (rtoCode || '01') + '-' + Math.floor(1000 + Math.random() * 9000);

      const newDriver = new Driver({
        driverId,
        name,
        phone: phone || '9840112233',
        vehicleId,
        vehicleType: vehicleType || '32ft Heavy Trailer',
        status: 'online',
        currentLocation: {
          lat: initialLat || 13.0844, // Default Chennai Port CFS
          lng: initialLng || 80.2936
        },
        stationHub: stationHub || 'Rajaji Salai, Chennai Port CFS',
        rtoCode: rtoCode || '01',
        rating: 4.88 + Math.random() * 0.1,
        reliability: 0.96 + Math.random() * 0.03,
        churnRisk: 0.02,
        earnings: 45000 + Math.floor(Math.random() * 10000),
        completedDeliveries: 50 + Math.floor(Math.random() * 30),
        cancellationRate: 0.01
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
      const drivers = await Driver.find().sort({ createdAt: -1 });
      res.json(drivers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Update online status
  toggleStatus = async (req: Request, res: Response) => {
    try {
      const { driverId } = req.params;
      const { status } = req.body; // 'online' | 'offline' | 'busy' | 'in_transit'

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

      // Log to telemetry database
      const telemetryLog = new Telemetry({
        driverId,
        orderId: activeOrderId || null,
        location: { lat, lng },
        speed: speed || 55,
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

      res.json({ success: true, driver });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
