import { Router } from 'express';
import { Server as SocketServer } from 'socket.io';
import { OrderController } from '../controllers/OrderController.js';
import { DriverController } from '../controllers/DriverController.js';
import { AnalyticsController } from '../controllers/AnalyticsController.js';
import { IncidentController } from '../controllers/IncidentController.js';

export function setupRoutes(io: SocketServer): Router {
  const router = Router();

  const orderCtrl = new OrderController(io);
  const driverCtrl = new DriverController(io);
  const analyticsCtrl = new AnalyticsController();
  const incidentCtrl = new IncidentController(io);

  // Orders Endpoints
  router.get('/orders', orderCtrl.getOrders);
  router.get('/orders/:orderId', orderCtrl.getOrderById);
  router.post('/orders', orderCtrl.createOrder);
  router.put('/orders/:orderId/quote-bill', orderCtrl.quoteBill);
  router.put('/orders/:orderId/accept-bill', orderCtrl.acceptBill);
  router.put('/orders/:orderId/reject-bill', orderCtrl.rejectBill);
  router.post('/orders/:orderId/request-dispatch', orderCtrl.requestDispatch);
  router.put('/orders/:orderId/complete', orderCtrl.completeOrder);
  router.put('/orders/:orderId/status', orderCtrl.updateStatus);
  router.post('/orders/match', orderCtrl.matchDriver);

  // Driver Dispatch Response
  router.post('/drivers/dispatch-response', orderCtrl.handleDispatchResponse);

  // Drivers Endpoints
  router.post('/drivers', driverCtrl.registerDriver);
  router.get('/drivers', driverCtrl.getDrivers);
  router.put('/drivers/:driverId/status', driverCtrl.toggleStatus);
  router.post('/drivers/:driverId/telemetry', driverCtrl.updateLocation);

  // Analytics
  router.get('/analytics', analyticsCtrl.getAnalytics);
  router.post('/analytics/simulate', analyticsCtrl.runSimulation);

  // Incidents
  router.get('/incidents', incidentCtrl.getIncidents);
  router.post('/incidents', incidentCtrl.createIncident);
  router.put('/incidents/:incidentId/resolve', incidentCtrl.resolveIncident);

  return router;
}
