import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupRoutes } from './routes/api.js';
import { seedDatabase } from './seed.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Setup __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Socket.IO Setup
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Setup socket connections
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('update_telemetry', async (data) => {
    try {
      const { driverId, location, speed, heading, activeOrderId } = data;
      if (driverId && location) {
        io.emit('TELEMETRY_UPDATED', {
          driverId,
          location,
          speed: speed || 55,
          heading: heading || 0,
          activeOrderId
        });
      }
    } catch (err) {
      console.error('Error handling socket update_telemetry:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Setup API Routes
const apiRouter = setupRoutes(io);
app.use('/api', apiRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date()
  });
});

// Connect to Database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quantum_express';

async function connectDatabase() {
  console.log('Connecting to MongoDB Atlas...');
  try {
    // Set a short server selection timeout so we fail fast and fall back quickly
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
    console.log('✓ Successfully connected to MongoDB Atlas database!');
    await seedDatabase();
  } catch (err) {
    console.error('✗ MongoDB Atlas connection failed! Falling back to local In-Memory MongoDB server...');
    console.error(err);
    try {
      const mongoServer = await MongoMemoryServer.create();
      const localUri = mongoServer.getUri();
      await mongoose.connect(localUri);
      console.log('✓ Connected to local In-Memory MongoDB Server successfully!');
      await seedDatabase();
    } catch (localErr) {
      console.error('✗ Critical: Failed to launch local In-Memory MongoDB fallback!', localErr);
    }
  }
}

connectDatabase();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✓ Fleet Backend API Server is running on port ${PORT}`);
  console.log(`✓ WebSocket Server is ready`);
});
