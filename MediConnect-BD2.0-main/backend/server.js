const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { sequelize } = require('./models');
const NotificationService = require('./services/notificationService');

// Routes
// ===== NEW SCHEMA ROUTES (Active) =====
const newAuthRoutes = require('./routes/newAuthRoutes');
const newDoctorRoutes = require('./routes/newDoctorRoutes');
const newAppointmentRoutes = require('./routes/newAppointmentRoutes');
const patientRoutes = require('./routes/patientRoutes');

// ===== OLD ROUTES (Commented out to prevent crashes) =====
// Uncomment these when you need the full system
const userRoutes = require('./routes/userRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const documentRoutes = require('./routes/documentRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
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

// API Routes
// ===== NEW SCHEMA ROUTES (Active) =====
app.use('/api/v2/auth', newAuthRoutes);
app.use('/api/v2/doctors', newDoctorRoutes);
app.use('/api/v2/appointments', newAppointmentRoutes);
app.use('/api/v2/patients', patientRoutes);

// ===== OLD ROUTES (Active for compatibility) =====
// app.use('/api/auth', userRoutes);
// app.use('/api/doctors', doctorRoutes); // Commented - model mismatch with new schema
// app.use('/api/appointments', appointmentRoutes);
// app.use('/api/emergency', emergencyRoutes);
// app.use('/api/reviews', reviewRoutes);
// app.use('/api/notifications', notificationRoutes);
// Document management routes (file uploads)
app.use('/api/documents', documentRoutes);

// Socket.io with authentication
const io = new Server(server, {
    cors: { 
        origin: "http://localhost:3000",
        credentials: true
    }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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

    // Join queue room if doctor
    if (socket.userRole === 'DOCTOR') {
        socket.join(`doctor_${socket.userId}`);
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

// Handle uncaught errors to prevent silent exits
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Sync Database and Start Server
const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: false }).then(() => {
    console.log('MySQL Database Synced');
    const serverInstance = server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Backend accessible at: http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
    
    serverInstance.on('error', (err) => {
        console.error('❌ Server failed to start:', err);
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use`);
        }
        process.exit(1);
    });
    
    serverInstance.on('listening', () => {
        console.log('✅ Server is now listening and ready to accept connections');
    });
}).catch(err => {
    console.error('Failed to sync database:', err);
    process.exit(1);
});