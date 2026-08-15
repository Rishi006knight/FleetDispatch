import mongoose, { Schema, Document } from 'mongoose';

export interface IDriver extends Document {
  driverId: string;
  name: string;
  phone: string;
  vehicleId: string;
  vehicleType: string;
  status: 'online' | 'offline' | 'busy' | 'in_transit';
  currentLocation: {
    lat: number;
    lng: number;
  };
  stationHub?: string;
  rtoCode?: string;
  rating: number;
  reliability: number;
  churnRisk: number;
  earnings: number;
  completedDeliveries: number;
  cancellationRate: number;
  updatedAt: Date;
}

const DriverSchema: Schema = new Schema({
  driverId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  vehicleId: { type: String, required: true },
  vehicleType: { type: String, default: '32ft Heavy Trailer' },
  status: { type: String, enum: ['online', 'offline', 'busy', 'in_transit'], default: 'online' },
  currentLocation: {
    lat: { type: Number, required: true, default: 13.0844 },
    lng: { type: Number, required: true, default: 80.2936 }
  },
  stationHub: { type: String, default: 'Chennai Port CFS' },
  rtoCode: { type: String, default: '01' },
  rating: { type: Number, default: 4.92 },
  reliability: { type: Number, default: 0.98 },
  churnRisk: { type: Number, default: 0.02 },
  earnings: { type: Number, default: 48500 },
  completedDeliveries: { type: Number, default: 64 },
  cancellationRate: { type: Number, default: 0.01 }
}, {
  timestamps: true
});

export default mongoose.model<IDriver>('Driver', DriverSchema);
