import mongoose, { Schema, Document } from 'mongoose';

export interface ITelemetry extends Document {
  driverId: string;
  orderId: string | null;
  location: {
    lat: number;
    lng: number;
  };
  speed: number; // km/h
  heading: number; // degrees
  timestamp: Date;
}

const TelemetrySchema: Schema = new Schema({
  driverId: { type: String, required: true },
  orderId: { type: String, default: null },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  speed: { type: Number, required: true },
  heading: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Index for query speed on historical data
TelemetrySchema.index({ driverId: 1, timestamp: -1 });

export default mongoose.model<ITelemetry>('Telemetry', TelemetrySchema);
