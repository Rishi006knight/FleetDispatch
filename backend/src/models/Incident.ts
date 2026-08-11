import mongoose, { Schema, Document } from 'mongoose';

export interface IIncident extends Document {
  incidentId: string;
  orderId: string | null;
  driverId: string | null;
  type: 'delay' | 'theft' | 'route_deviation' | 'fraud_pod' | 'breakdown';
  severity: 'low' | 'medium' | 'high';
  message: string;
  status: 'open' | 'resolved';
  timestamp: Date;
}

const IncidentSchema: Schema = new Schema({
  incidentId: { type: String, required: true, unique: true },
  orderId: { type: String, default: null },
  driverId: { type: String, default: null },
  type: { 
    type: String, 
    enum: ['delay', 'theft', 'route_deviation', 'fraud_pod', 'breakdown'], 
    required: true 
  },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.model<IIncident>('Incident', IncidentSchema);
