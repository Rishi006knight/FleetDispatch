import { Request, Response } from 'express';
import Incident from '../models/Incident.js';
import { Server as SocketServer } from 'socket.io';

export class IncidentController {
  private io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }

  // Get all incidents
  getIncidents = async (req: Request, res: Response) => {
    try {
      const incidents = await Incident.find().sort({ createdAt: -1 });
      res.json(incidents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Create an incident manually
  createIncident = async (req: Request, res: Response) => {
    try {
      const { orderId, driverId, type, severity, message } = req.body;

      if (!type || !message) {
        return res.status(400).json({ error: 'Type and message are required.' });
      }

      const incidentId = 'INC-' + Math.floor(100000 + Math.random() * 900000);

      const newIncident = new Incident({
        incidentId,
        orderId: orderId || null,
        driverId: driverId || null,
        type,
        severity: severity || 'medium',
        message,
        status: 'open'
      });

      await newIncident.save();
      this.io.emit('INCIDENT_CREATED', newIncident);

      res.status(201).json(newIncident);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Resolve an incident
  resolveIncident = async (req: Request, res: Response) => {
    try {
      const { incidentId } = req.params;

      const incident = await Incident.findOne({ incidentId });
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found.' });
      }

      incident.status = 'resolved';
      await incident.save();

      this.io.emit('INCIDENT_RESOLVED', incident);
      res.json(incident);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
