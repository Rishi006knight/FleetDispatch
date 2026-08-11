import mongoose, { Schema, Document } from 'mongoose';

export interface IDriver extends Document {
  driverId: string;
  name: string;
  phone: string;
  vehicleId: string;
  vehicleType: 'bike' | 'car' | 'truck' | 'scooter';
  status: 'online' | 'offline' | 'busy';
  currentLocation: {
    lat: number;
    lng: number;
  };
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
  vehicleType: { type: String, enum: ['bike', 'car', 'truck', 'scooter'], default: 'bike' },
  status: { type: String, enum: ['online', 'offline', 'busy'], default: 'offline' },
  currentLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  rating: { type: Number, default: 5.0 },
  reliability: { type: Number, default: 1.0 },
  churnRisk: { type: Number, default: 0.0 },
  earnings: { type: Number, default: 0 },
  completedDeliveries: { type: Number, default: 0 },
  cancellationRate: { type: Number, default: 0.0 }
}, {
  timestamps: true
});

export default mongoose.model<IDriver>('Driver', DriverSchema);
