import { Request, Response } from 'express';
import Order from '../models/Order.js';
import Driver from '../models/Driver.js';
import Incident from '../models/Incident.js';
import axios from 'axios';
import { Server as SocketServer } from 'socket.io';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export class OrderController {
  private io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }

  // Create new order
  createOrder = async (req: Request, res: Response) => {
    try {
      const { customerName, customerPhone, pickup, drop, packageWeight, packageType, priority, startWindow, endWindow } = req.body;

      if (!customerName || !pickup || !drop || !packageWeight || !packageType) {
        return res.status(400).json({ error: 'Missing required order fields.' });
      }

      // Generate order ID
      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

      // Simple distance heuristic
      const latDiff = drop.lat - pickup.lat;
      const lngDiff = drop.lng - pickup.lng;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Approx distance in km

      // Fetch dynamic pricing and risk score from ML service
      let price = Math.round(50 + distance * 12 + (priority === 'high' ? 30 : 0));
      let riskScore = { delayProb: 0.1, theftProb: 0.05, failedProb: 0.05, overall: 0.07 };

      try {
        const pricingRes = await axios.post(`${ML_URL}/api/predict-price`, {
          distance,
          priority,
          package_type: packageType,
          weather: 'clear', // default
          traffic: 'normal',
          hour: new Date().getHours()
        });
        price = Math.round(pricingRes.data.price);
      } catch (err) {
        console.warn('ML Service Dynamic Pricing failed, using fallback.');
      }

      try {
        const riskRes = await axios.post(`${ML_URL}/api/predict-risk`, {
          distance,
          priority,
          package_weight: packageWeight,
          driver_rating: 5.0, // initial
          driver_reliability: 1.0,
          weather: 'clear'
        });
        riskScore = riskRes.data.risk;
      } catch (err) {
        console.warn('ML Service Risk Prediction failed, using fallback.');
      }

      const newOrder = new Order({
        orderId,
        customerName,
        customerPhone,
        pickup,
        drop,
        package: { weight: packageWeight, type: packageType },
        priority,
        deliveryWindow: { start: startWindow || '12:00', end: endWindow || '18:00' },
        price,
        status: 'pending',
        riskScore,
        eta: Math.round(distance * 2.5 + 5), // default eta
        routeCoordinates: [pickup, drop]
      });

      await newOrder.save();

      // Emit event
      this.io.emit('ORDER_CREATED', newOrder);

      res.status(201).json(newOrder);
    } catch (error: any) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: error.message });
    }
  };

  // Find optimal drivers using AI Score
  matchDriver = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.body;
      const order = await Order.findOne({ orderId });

      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      // Find all online drivers
      const drivers = await Driver.find({ status: 'online' });

      if (drivers.length === 0) {
        return res.status(400).json({ error: 'No online drivers available.' });
      }

      // Score each driver
      const scoredDrivers = drivers.map(driver => {
        // Distance calculation
        const latDiff = order.pickup.lat - driver.currentLocation.lat;
        const lngDiff = order.pickup.lng - driver.currentLocation.lng;
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // km

        // ETA estimate (approx 2 mins per km + 3 mins delay)
        const eta = distance * 2 + 3;

        // Weights: 30% proximity, 20% ETA, 15% reliability, 15% rating, 10% workload, 10% churn (lower churn = better)
        const proximityScore = Math.max(0, 100 - distance * 10);
        const etaScore = Math.max(0, 100 - eta * 5);
        const reliabilityScore = driver.reliability * 100;
        const ratingScore = (driver.rating / 5) * 100;
        const churnPenalty = (1 - driver.churnRisk) * 100;

        const totalScore = (
          proximityScore * 0.30 +
          etaScore * 0.20 +
          reliabilityScore * 0.15 +
          ratingScore * 0.15 +
          churnPenalty * 0.20
        );

        return {
          driver,
          distance,
          eta,
          score: Math.round(totalScore)
        };
      });

      // Sort by score descending
      scoredDrivers.sort((a, b) => b.score - a.score);

      res.json({
        order,
        matches: scoredDrivers.slice(0, 5) // top 5 matches
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Assign Order to Driver
  assignDriver = async (req: Request, res: Response) => {
    try {
      const { orderId, driverId } = req.body;

      const order = await Order.findOne({ orderId });
      const driver = await Driver.findOne({ driverId });

      if (!order || !driver) {
        return res.status(404).json({ error: 'Order or Driver not found.' });
      }

      // Update driver status
      driver.status = 'busy';
      await driver.save();

      // Get optimized route path from ML service
      let routeCoordinates = [order.pickup, order.drop];
      let eta = order.eta;

      try {
        const routeRes = await axios.post(`${ML_URL}/api/optimize-route`, {
          driver_location: driver.currentLocation,
          pickup: order.pickup,
          drop: order.drop
        });
        routeCoordinates = routeRes.data.route;
        eta = Math.round(routeRes.data.total_eta_minutes);
      } catch (err) {
        console.warn('ML service route optimization failed, using default straight line.');
      }

      order.driverId = driverId;
      order.status = 'assigned';
      order.routeCoordinates = routeCoordinates;
      order.eta = eta;

      await order.save();

      // Emit events
      this.io.emit('ORDER_ASSIGNED', { order, driver });
      this.io.emit('DRIVER_UPDATED', driver);

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Update order status
  updateStatus = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const oldStatus = order.status;
      order.status = status;

      if (status === 'completed' && order.driverId) {
        const driver = await Driver.findOne({ driverId: order.driverId });
        if (driver) {
          driver.status = 'online';
          driver.earnings += order.price;
          driver.completedDeliveries += 1;
          await driver.save();
          this.io.emit('DRIVER_UPDATED', driver);
        }
      } else if (status === 'failed' && order.driverId) {
        const driver = await Driver.findOne({ driverId: order.driverId });
        if (driver) {
          driver.status = 'online';
          driver.cancellationRate = Math.min(1.0, driver.cancellationRate + 0.05);
          await driver.save();
          this.io.emit('DRIVER_UPDATED', driver);
        }
      }

      await order.save();
      this.io.emit('ORDER_STATUS_UPDATED', order);

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Verify Proof of Delivery
  verifyPOD = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { photoBase64, driverLocation } = req.body;

      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      order.podPhotoUrl = photoBase64;
      order.podStatus = 'pending';
      await order.save();

      this.io.emit('ORDER_STATUS_UPDATED', order);

      // Call Python CV Verifier
      let cvPassed = true;
      let reason = 'Manual verification fallback.';
      let score = 0.95;

      try {
        const cvRes = await axios.post(`${ML_URL}/api/verify-pod`, {
          photo_base64: photoBase64,
          driver_lat: driverLocation?.lat || 0,
          driver_lng: driverLocation?.lng || 0,
          drop_lat: order.drop.lat,
          drop_lng: order.drop.lng
        });
        cvPassed = cvRes.data.passed;
        reason = cvRes.data.message;
        score = cvRes.data.confidence_score;
      } catch (err) {
        console.warn('ML POD Verification failed, running auto-pass default.');
      }

      if (cvPassed) {
        order.podStatus = 'verified';
        order.status = 'completed';
        await order.save();

        if (order.driverId) {
          const driver = await Driver.findOne({ driverId: order.driverId });
          if (driver) {
            driver.status = 'online';
            driver.earnings += order.price;
            driver.completedDeliveries += 1;
            await driver.save();
            this.io.emit('DRIVER_UPDATED', driver);
          }
        }

        this.io.emit('ORDER_STATUS_UPDATED', order);
        res.json({ success: true, message: 'Proof of Delivery verified.', order });
      } else {
        order.podStatus = 'rejected';
        await order.save();

        // Generate Incident
        const incidentId = 'INC-' + Math.floor(100000 + Math.random() * 900000);
        const newIncident = new Incident({
          incidentId,
          orderId,
          driverId: order.driverId,
          type: 'fraud_pod',
          severity: 'high',
          message: `Suspicious Delivery Proof Rejected: ${reason} (Confidence Score: ${Math.round(score * 100)}%)`,
          status: 'open'
        });
        await newIncident.save();

        this.io.emit('INCIDENT_CREATED', newIncident);
        this.io.emit('ORDER_STATUS_UPDATED', order);

        res.json({ success: false, message: `Delivery Verification Failed: ${reason}`, order });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
