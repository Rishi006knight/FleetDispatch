import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  customerName: string;
  customerPhone: string;
  businessCode: string;
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
  packageDetails?: {
    weight: number;
    type: string;
    priority?: string;
  };
  package?: {
    weight: number;
    type: string;
  };
  warehouseServices?: {
    facilityId?: string;
    storageType?: string;
    days?: number;
    handlingRequired?: boolean;
  };
  priority: 'low' | 'medium' | 'high';
  deliveryWindow?: {
    start: string;
    end: string;
  };
  price: number;
  totalBillAmount?: number;
  itemizedBill?: {
    freightBase?: number;
    storageFee?: number;
    handlingFee?: number;
    tollSurcharge?: number;
    notes?: string;
  };
  status: 
    | 'quote_requested'
    | 'bill_presented'
    | 'bill_accepted'
    | 'bill_rejected'
    | 'ready_for_dispatch'
    | 'dispatch_requested'
    | 'driver_assigned'
    | 'assigned'
    | 'pickup_arrived'
    | 'in_transit'
    | 'out_for_delivery'
    | 'completed'
    | 'failed'
    | 'rejected';
  driverId: string | null;
  dispatchRequestedDriverId?: string | null;
  driverName?: string | null;
  vehicleId?: string | null;
  routeCoordinates: Array<{ lat: number; lng: number }>;
  eta: number; // in minutes
  riskScore: {
    delayProb: number;
    theftProb: number;
    failedProb: number;
    overall: number;
  };
  podPhotoUrl: string | null;
  podNotes?: string | null;
  podStatus: 'pending' | 'verified' | 'rejected' | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: '9840123456' },
  businessCode: { type: String, default: 'ABC123', index: true },
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
  packageDetails: {
    weight: { type: Number, default: 12000 },
    type: { type: String, default: 'Heavy Machinery & Parts' },
    priority: { type: String, default: 'medium' }
  },
  package: {
    weight: { type: Number, default: 12000 },
    type: { type: String, default: 'Heavy Machinery & Parts' }
  },
  warehouseServices: {
    facilityId: { type: String, default: 'chennai-port' },
    storageType: { type: String, default: 'None' },
    days: { type: Number, default: 0 },
    handlingRequired: { type: Boolean, default: false }
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deliveryWindow: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '20:00' }
  },
  price: { type: Number, default: 24500 },
  totalBillAmount: { type: Number, default: 24500 },
  itemizedBill: {
    freightBase: { type: Number, default: 18500 },
    storageFee: { type: Number, default: 0 },
    handlingFee: { type: Number, default: 0 },
    tollSurcharge: { type: Number, default: 2400 },
    notes: { type: String, default: '' }
  },
  status: { 
    type: String, 
    enum: [
      'quote_requested', 
      'bill_presented', 
      'bill_accepted', 
      'bill_rejected', 
      'ready_for_dispatch', 
      'dispatch_requested', 
      'driver_assigned', 
      'assigned', 
      'pickup_arrived', 
      'in_transit', 
      'out_for_delivery', 
      'completed', 
      'failed', 
      'rejected'
    ], 
    default: 'quote_requested' 
  },
  driverId: { type: String, default: null },
  dispatchRequestedDriverId: { type: String, default: null },
  driverName: { type: String, default: null },
  vehicleId: { type: String, default: null },
  routeCoordinates: [{
    lat: { type: Number },
    lng: { type: Number }
  }],
  eta: { type: Number, default: 180 },
  riskScore: {
    delayProb: { type: Number, default: 0.05 },
    theftProb: { type: Number, default: 0.02 },
    failedProb: { type: Number, default: 0.01 },
    overall: { type: Number, default: 0.03 }
  },
  podPhotoUrl: { type: String, default: null },
  podNotes: { type: String, default: null },
  podStatus: { type: String, enum: ['pending', 'verified', 'rejected', null], default: null }
}, {
  timestamps: true
});

export default mongoose.model<IOrder>('Order', OrderSchema);
