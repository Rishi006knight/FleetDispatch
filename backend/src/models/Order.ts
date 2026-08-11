import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  customerName: string;
  customerPhone: string;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  drop: {
    lat: number;
    lng: number;
    address: string;
  };
  package: {
    weight: number;
    type: string;
  };
  priority: 'low' | 'medium' | 'high';
  deliveryWindow: {
    start: string;
    end: string;
  };
  price: number;
  status: 'pending' | 'assigned' | 'picked_up' | 'out_for_delivery' | 'completed' | 'failed';
  driverId: string | null;
  routeCoordinates: Array<{ lat: number; lng: number }>;
  eta: number; // in minutes
  riskScore: {
    delayProb: number;
    theftProb: number;
    failedProb: number;
    overall: number;
  };
  podPhotoUrl: string | null;
  podStatus: 'pending' | 'verified' | 'rejected' | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  pickup: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  drop: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  package: {
    weight: { type: Number, required: true },
    type: { type: String, required: true }
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deliveryWindow: {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  price: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'assigned', 'picked_up', 'out_for_delivery', 'completed', 'failed'], 
    default: 'pending' 
  },
  driverId: { type: String, default: null },
  routeCoordinates: [{
    lat: { type: Number },
    lng: { type: Number }
  }],
  eta: { type: Number, default: 0 },
  riskScore: {
    delayProb: { type: Number, default: 0 },
    theftProb: { type: Number, default: 0 },
    failedProb: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  },
  podPhotoUrl: { type: String, default: null },
  podStatus: { type: String, enum: ['pending', 'verified', 'rejected', null], default: null }
}, {
  timestamps: true
});

export default mongoose.model<IOrder>('Order', OrderSchema);
