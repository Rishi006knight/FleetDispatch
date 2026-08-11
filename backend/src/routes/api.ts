import { Router } from 'express';
import { Server as SocketServer } from 'socket.io';
import { OrderController } from '../controllers/OrderController.js';
import { DriverController } from '../controllers/DriverController.js';
import { AnalyticsController } from '../controllers/AnalyticsController.js';
import { IncidentController } from '../controllers/IncidentController.js';
import Order from '../models/Order.js';

export function setupRoutes(io: SocketServer): Router {
  const router = Router();

  const orderCtrl = new OrderController(io);
  const driverCtrl = new DriverController(io);
  const analyticsCtrl = new AnalyticsController();
  const incidentCtrl = new IncidentController(io);

  // Orders
  router.post('/orders', orderCtrl.createOrder);
  router.post('/orders/match', orderCtrl.matchDriver);
  router.post('/orders/assign', orderCtrl.assignDriver);
  router.put('/orders/:orderId/status', orderCtrl.updateStatus);
  router.post('/orders/:orderId/verify-pod', orderCtrl.verifyPOD);
  
  router.get('/orders', async (req, res) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/orders/:orderId', async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.orderId });
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Drivers
  router.post('/drivers', driverCtrl.registerDriver);
  router.get('/drivers', driverCtrl.getDrivers);
  router.put('/drivers/:driverId/status', driverCtrl.toggleStatus);
  router.post('/drivers/:driverId/telemetry', driverCtrl.updateLocation);

  // Analytics & Simulations
  router.get('/analytics', analyticsCtrl.getAnalytics);
  router.post('/analytics/simulate', analyticsCtrl.runSimulation);

  // Incidents
  router.get('/incidents', incidentCtrl.getIncidents);
  router.post('/incidents', incidentCtrl.createIncident);
  router.put('/incidents/:incidentId/resolve', incidentCtrl.resolveIncident);

  return router;
}
