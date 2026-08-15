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

  // Get all orders with optional businessCode filter
  getOrders = async (req: Request, res: Response) => {
    try {
      const { businessCode } = req.query;
      const query: any = {};
      if (businessCode) {
        query.businessCode = String(businessCode).toUpperCase();
      }

      const orders = await Order.find(query).sort({ createdAt: -1 });
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  // Get single order
  getOrderById = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  // Create new freight order request
  createOrder = async (req: Request, res: Response) => {
    try {
      const { 
        customerName, 
        customerPhone, 
        businessCode, 
        pickup, 
        drop, 
        packageDetails, 
        package: legacyPackage,
        packageWeight, 
        packageType, 
        priority, 
        warehouseServices 
      } = req.body;

      if (!customerName || !pickup || !drop) {
        return res.status(400).json({ error: 'Missing required order fields (customerName, pickup, drop).' });
      }

      // Generate order ID (e.g. QE-123456 or ORD-123456)
      const orderId = 'QE-' + Math.floor(100000 + Math.random() * 900000);

      const pkgWeight = packageDetails?.weight || legacyPackage?.weight || (packageWeight ? packageWeight * 1000 : 12500);
      const pkgType = packageDetails?.type || legacyPackage?.type || packageType || 'Heavy Machinery & Parts';
      const bCode = (businessCode || 'ABC123').toUpperCase();

      // Distance heuristic
      const latDiff = drop.lat - pickup.lat;
      const lngDiff = drop.lng - pickup.lng;
      const distance = Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 * 10) / 10; // km

      // Base pricing calculation
      const weightTons = pkgWeight / 1000;
      const estimatedFreight = Math.round(weightTons * 1250 + distance * 18 + 5000);
      const estimatedToll = Math.round(weightTons * 150 + 1800);
      const storageFee = warehouseServices?.storageType && warehouseServices?.storageType !== 'None'
        ? (warehouseServices.days || 3) * 600
        : 0;
      const handlingFee = warehouseServices?.handlingRequired ? 1250 : 0;
      const totalAmount = estimatedFreight + estimatedToll + storageFee + handlingFee;

      const newOrder = new Order({
        orderId,
        customerName,
        customerPhone: customerPhone || '9840123456',
        businessCode: bCode,
        pickup,
        drop,
        packageDetails: {
          weight: pkgWeight,
          type: pkgType,
          priority: priority || 'medium'
        },
        package: {
          weight: pkgWeight,
          type: pkgType
        },
        warehouseServices: warehouseServices || {
          facilityId: 'chennai-port',
          storageType: 'None',
          days: 0,
          handlingRequired: false
        },
        priority: priority || 'medium',
        price: totalAmount,
        totalBillAmount: totalAmount,
        itemizedBill: {
          freightBase: estimatedFreight,
          storageFee,
          handlingFee,
          tollSurcharge: estimatedToll,
          notes: 'Standard Tamil Nadu industrial corridor highway freight & terminal toll calculation.'
        },
        status: 'quote_requested',
        eta: Math.round(distance / 45 * 60), // ETA minutes at 45km/h
        routeCoordinates: [pickup, drop]
      });

      await newOrder.save();

      // Emit events to room and broadcast
      this.io.to(`customer_${bCode}`).emit('ORDER_CREATED', newOrder);
      this.io.to('admin').emit('ORDER_CREATED', newOrder);
      this.io.to('admin').emit('QUOTE_REQUESTED', newOrder);
      this.io.emit('ORDER_CREATED', newOrder);

      res.status(201).json(newOrder);
    } catch (error: any) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: error.message });
    }
  };

  // Dispatcher presents an itemized bill quotation to the shipper
  quoteBill = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { freightBase, storageFee, handlingFee, tollSurcharge, notes, totalAmount } = req.body;

      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      const total = totalAmount || (freightBase + storageFee + handlingFee + tollSurcharge);

      order.itemizedBill = {
        freightBase: freightBase || 0,
        storageFee: storageFee || 0,
        handlingFee: handlingFee || 0,
        tollSurcharge: tollSurcharge || 0,
        notes: notes || ''
      };
      order.totalBillAmount = total;
      order.price = total;
      order.status = 'bill_presented';

      await order.save();

      // Emit to customer and admin rooms
      this.io.to(`customer_${order.businessCode}`).emit('BILL_QUOTED', order);
      this.io.to('admin').emit('BILL_QUOTED', order);
      this.io.emit('BILL_QUOTED', order);

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Shipper accepts the itemized bill quotation
  acceptBill = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      order.status = 'ready_for_dispatch';
      await order.save();

      this.io.to(`customer_${order.businessCode}`).emit('BILL_ACCEPTED', order);
      this.io.to('admin').emit('BILL_ACCEPTED', order);
      this.io.emit('BILL_ACCEPTED', order);

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Shipper rejects the quotation bill
  rejectBill = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      order.status = 'bill_rejected';
      await order.save();

      this.io.to(`customer_${order.businessCode}`).emit('BILL_REJECTED', order);
      this.io.to('admin').emit('BILL_REJECTED', order);
      this.io.emit('BILL_REJECTED', order);

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Dispatcher requests a specific heavy truck driver for dispatch
  requestDispatch = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { driverId } = req.body;

      const order = await Order.findOne({ orderId });
      const driver = await Driver.findOne({ driverId });

      if (!order) return res.status(404).json({ error: 'Order not found.' });
      if (!driver) return res.status(404).json({ error: 'Driver not found.' });

      order.status = 'dispatch_requested';
      order.dispatchRequestedDriverId = driverId;
      order.driverName = driver.name;
      order.vehicleId = driver.vehicleId;

      await order.save();

      // Emit to driver room and admin
      this.io.to(driverId).emit('ORDER_DISPATCH_REQUEST', { order, driver });
      this.io.to('admin').emit('ORDER_DISPATCH_REQUEST', { order, driver });
      this.io.emit('ORDER_DISPATCH_REQUEST', { order, driver });

      res.json({ success: true, order, driver });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Driver responds to dispatch request (accept or decline)
  handleDispatchResponse = async (req: Request, res: Response) => {
    try {
      const { orderId, driverId, decision } = req.body;

      const order = await Order.findOne({ orderId });
      const driver = await Driver.findOne({ driverId });

      if (!order || !driver) {
        return res.status(404).json({ error: 'Order or Driver not found.' });
      }

      if (decision === 'accept') {
        driver.status = 'busy';
        await driver.save();

        order.driverId = driverId;
        order.driverName = driver.name;
        order.vehicleId = driver.vehicleId;
        order.status = 'driver_assigned';
        order.dispatchRequestedDriverId = null;

        await order.save();

        this.io.to(driverId).emit('ORDER_ASSIGNED', { order, driver });
        this.io.to(`customer_${order.businessCode}`).emit('ORDER_ASSIGNED', { order, driver });
        this.io.to('admin').emit('ORDER_ASSIGNED', { order, driver });
        this.io.emit('ORDER_ASSIGNED', { order, driver });

        res.json({ success: true, decision: 'accepted', order, driver });
      } else {
        order.status = 'ready_for_dispatch';
        order.dispatchRequestedDriverId = null;
        await order.save();

        this.io.to('admin').emit('DISPATCH_REQUEST_DECLINED', { order, driver });
        this.io.emit('DISPATCH_REQUEST_DECLINED', { order, driver });

        res.json({ success: true, decision: 'declined', order });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Complete consignment delivery
  completeOrder = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { podNotes, photoBase64 } = req.body;

      const order = await Order.findOne({ orderId });
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      order.status = 'completed';
      order.podStatus = 'verified';
      if (podNotes) order.podNotes = podNotes;
      if (photoBase64) order.podPhotoUrl = photoBase64;

      await order.save();

      // Free up driver and add payout
      if (order.driverId) {
        const driver = await Driver.findOne({ driverId: order.driverId });
        if (driver) {
          driver.status = 'online';
          driver.earnings += (order.totalBillAmount || order.price || 24500);
          driver.completedDeliveries += 1;
          await driver.save();

          this.io.emit('DRIVER_UPDATED', driver);
        }
      }

      this.io.to(`customer_${order.businessCode}`).emit('ORDER_STATUS_UPDATED', order);
      this.io.to('admin').emit('ORDER_STATUS_UPDATED', order);
      this.io.emit('ORDER_STATUS_UPDATED', order);

      res.json({ success: true, order });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Find matching drivers
  matchDriver = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.body;
      const order = await Order.findOne({ orderId });

      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const drivers = await Driver.find({ status: 'online' });
      if (drivers.length === 0) {
        return res.json({ order, matches: [] });
      }

      const scoredDrivers = drivers.map(driver => {
        const latDiff = order.pickup.lat - driver.currentLocation.lat;
        const lngDiff = order.pickup.lng - driver.currentLocation.lng;
        const distance = Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 * 10) / 10;
        const eta = Math.round(distance / 45 * 60 + 5);

        const proximityScore = Math.max(0, 100 - distance * 5);
        const reliabilityScore = driver.reliability * 100;
        const ratingScore = (driver.rating / 5) * 100;

        const totalScore = Math.round(proximityScore * 0.4 + reliabilityScore * 0.3 + ratingScore * 0.3);

        return {
          driver,
          distance,
          eta,
          score: totalScore
        };
      });

      scoredDrivers.sort((a, b) => b.score - a.score);

      res.json({
        order,
        matches: scoredDrivers.slice(0, 6)
      });
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
      if (!order) return res.status(404).json({ error: 'Order not found.' });

      order.status = status;
      await order.save();

      this.io.to(`customer_${order.businessCode}`).emit('ORDER_STATUS_UPDATED', order);
      this.io.to('admin').emit('ORDER_STATUS_UPDATED', order);
      this.io.emit('ORDER_STATUS_UPDATED', order);

      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
