const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

console.log('📦 Loading database pool...');
const pool = require('./config/db'); // Raw SQL connection pool
console.log('📦 Loading NotificationService...');
const NotificationService = require('./services/notificationService');

// Routes
console.log('📦 Loading routes...');
const userRoutes = require('./routes/userRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const queueRoutes = require('./routes/queueRoutes');
const slotRoutes = require('./routes/slotRoutes');
console.log('✅ All routes loaded');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: { 
        origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
        credentials: true
    }
});

// Make io available to routes
app.set('io', io);

// Middleware - CORS Configuration for Direct Frontend Connection
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'MediConnect BD API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes - Updated to work with patients/doctors tables
app.use('/api/auth', userRoutes); // Updated userController to use patients table
app.use('/api/doctors', doctorRoutes); // Updated doctorController to use doctors table
app.use('/api/appointments', appointmentRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
// Document management routes (file uploads)
app.use('/api/documents', documentRoutes);
// Prescription routes (time-gated for doctors)
app.use('/api/prescriptions', prescriptionRoutes);
// Queue management routes
app.use('/api/queue', queueRoutes);
// Vitals management routes
app.use('/api/vitals', require('./routes/vitalsRoutes'));
// Slot management routes for appointments
app.use('/api/slots', slotRoutes);

// Socket.IO authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aVeryStrongAndSecretKey');
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
});

// Store connected users for targeted notifications
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole}) - Socket: ${socket.id}`);
    
    // Store user's socket connection
    connectedUsers.set(socket.userId, socket.id);

    // Join user's personal notification room
    socket.join(`user_${socket.userId}`);
    
    // Join patient room for queue updates
    socket.join(`patient_${socket.userId}`);

    // Join queue room if doctor
    if (socket.userRole === 'DOCTOR') {
        socket.join(`doctor_${socket.userId}`);
        socket.join(`doctor_${socket.userId}_queue`);
    }

    // Handle queue joining for patients
    socket.on('join_queue', (doctorId) => {
        socket.join(`queue_${doctorId}`);
        console.log(`👤 User ${socket.userId} joined queue for doctor ${doctorId}`);
    });

    // Handle queue leaving
    socket.on('leave_queue', (doctorId) => {
        socket.leave(`queue_${doctorId}`);
        console.log(`👋 User ${socket.userId} left queue for doctor ${doctorId}`);
    });

    // Queue update from doctor
    socket.on('update_queue', (data) => {
        io.to(`queue_${data.doctorId}`).emit('queue_updated', data);
        console.log(`📊 Queue updated for doctor ${data.doctorId}:`, data);
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.userId} - Socket: ${socket.id}`);
        connectedUsers.delete(socket.userId);
    });
});

// Make io instance available to routes
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// Initialize notification service
const notificationService = new NotificationService(io, connectedUsers);
app.set('notificationService', notificationService);

console.log('✅ Socket.IO and Notification Service initialized');

// Sync Database and Start Server
const PORT = process.env.PORT || 5000;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    console.error('Stack trace:', err.stack);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    console.error('Stack trace:', err.stack);
});

// Test database connection and start server
const startServer = async () => {
    try {
        // Test database connection
        const connection = await pool.getConnection();
        console.log(`✅ MySQL Database Connected on port ${process.env.DB_PORT || 3306}`);
        connection.release();

        // Start HTTP server
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🚀 MediConnect Backend Server (Direct Connection)`);
            console.log(`${'='.repeat(60)}`);
            console.log(`📍 Backend API: http://localhost:${PORT}/api`);
            console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
            console.log(`🌐 CORS Allowed: http://localhost:3000 (Frontend)`);
            console.log(`📂 File Uploads: http://localhost:${PORT}/uploads`);
            console.log(`🔌 WebSocket: Enabled`);
            console.log(`${'='.repeat(60)}\n`);
        }).on('error', (err) => {
            console.error('❌ Server error:', err);
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Please close the other application or use a different port.`);
            }
            process.exit(1);
        });
    } catch (error) {
        console.error('❌ Failed to connect to database:', error.message);
        process.exit(1);
    }
};

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});