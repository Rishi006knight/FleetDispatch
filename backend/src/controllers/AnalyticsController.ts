import { Request, Response } from 'express';
import Order from '../models/Order.js';
import Driver from '../models/Driver.js';
import Telemetry from '../models/Telemetry.js';
import axios from 'axios';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export class AnalyticsController {
  
  // Get dashboard analytics
  getAnalytics = async (req: Request, res: Response) => {
    try {
      const orders = await Order.find();
      const drivers = await Driver.find();

      const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.price, 0);

      const activeOrdersCount = orders
        .filter(o => ['assigned', 'picked_up', 'out_for_delivery'].includes(o.status))
        .length;

      const completedOrders = orders.filter(o => o.status === 'completed');
      const failedOrders = orders.filter(o => o.status === 'failed');
      const totalCompleted = completedOrders.length;
      
      // SLA compliance rate (dummy/simple calculation based on simulated delay probability)
      // Say, orders with low risk and completed = compliant
      const compliantOrders = completedOrders.filter(o => o.riskScore.overall < 0.3);
      const slaRate = totalCompleted > 0 
        ? Math.round((compliantOrders.length / totalCompleted) * 100) 
        : 100;

      // Carbon emission estimation
      // Assume average trip is 8 km. 
      // Bikes: 0.08 kg CO2/km, Cars: 0.21 kg, Trucks: 0.45 kg.
      let totalCarbon = 0; // in kg
      completedOrders.forEach(o => {
        const vehicle = drivers.find(d => d.driverId === o.driverId);
        const type = vehicle ? vehicle.vehicleType : 'bike';
        const factor = type === 'truck' ? 0.45 : type === 'car' ? 0.21 : 0.08;
        
        // Estimated distance based on price (approx Rs 12 per km, starting base Rs 50)
        const estDistance = Math.max(1, (o.price - 50) / 12);
        totalCarbon += estDistance * factor;
      });

      // Calculate driver performance leaderboard
      const driverMetrics = drivers.map(d => {
        return {
          driverId: d.driverId,
          name: d.name,
          rating: d.rating,
          earnings: d.earnings,
          completedDeliveries: d.completedDeliveries,
          churnRisk: d.churnRisk,
          status: d.status
        };
      }).sort((a, b) => b.completedDeliveries - a.completedDeliveries);

      res.json({
        totalRevenue,
        activeOrders: activeOrdersCount,
        slaCompliance: slaRate,
        carbonEmissionsKg: Math.round(totalCarbon * 10) / 10,
        totalOrdersCount: orders.length,
        completedCount: totalCompleted,
        failedCount: failedOrders.length,
        driverLeaderboard: driverMetrics.slice(0, 10)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // What-If Simulation
  runSimulation = async (req: Request, res: Response) => {
    try {
      const { additionalDrivers, demandIncreasePercent, zoneAlert } = req.body;

      // Count current statistics
      const currentDriversCount = await Driver.countDocuments({ status: { $ne: 'offline' } }) || 10;
      const currentOrdersCount = await Order.countDocuments() || 50;

      let simulationResult = {
        required_vehicles: Math.round(currentDriversCount * (1 + (demandIncreasePercent || 0) / 100)),
        expected_sla_percent: Math.max(60, Math.round(94 - (demandIncreasePercent || 0) * 0.4 + (additionalDrivers || 0) * 1.5)),
        additional_drivers_required: Math.max(0, Math.round((demandIncreasePercent || 0) * 0.3 - (additionalDrivers || 0))),
        estimated_revenue_increase: Math.round((demandIncreasePercent || 0) * 450),
        message: 'Local fallback simulation computed.'
      };

      try {
        const simRes = await axios.post(`${ML_URL}/api/simulate`, {
          current_drivers: currentDriversCount,
          current_orders: currentOrdersCount,
          additional_drivers: additionalDrivers || 0,
          demand_increase_percent: demandIncreasePercent || 0,
          zone: zoneAlert || 'all'
        });
        simulationResult = simRes.data;
      } catch (err) {
        console.warn('ML simulation endpoint failed, using local analytical fallback.');
      }

      res.json(simulationResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
