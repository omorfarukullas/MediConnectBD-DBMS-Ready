const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Middleware to protect routes - verifies JWT token
 * Attaches the authenticated user to req.user
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token from "Bearer <token>"
            token = req.headers.authorization.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aVeryStrongAndSecretKey');
            
            console.log('🔐 Token decoded:', { id: decoded.id, role: decoded.role });
            
            // Get user from appropriate table based on role
            let userData = null;
            
            if (decoded.role === 'PATIENT') {
                const [patients] = await pool.execute(
                    'SELECT id, full_name as name, email, phone, address, blood_group FROM patients WHERE id = ?',
                    [decoded.id]
                );
                userData = patients[0];
            } else if (decoded.role === 'DOCTOR') {
                const [doctors] = await pool.execute(
                    'SELECT id, full_name as name, email, phone, city, specialization FROM doctors WHERE id = ?',
                    [decoded.id]
                );
                userData = doctors[0];
            }

            if (!userData) {
                console.log('❌ User not found in database');
                return res.status(401).json({ message: 'User not found' });
            }

            // Attach user data with role to request
            req.user = {
                ...userData,
                role: decoded.role
            };

            console.log('✅ User authenticated:', { id: req.user.id, role: req.user.role });
            next();
        } catch (error) {
            console.error('Auth Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

/**
 * Middleware to check if user is an admin
 * Must be used AFTER the protect middleware
 */
const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
};

/**
 * Middleware to check if user is a doctor
 * Must be used AFTER the protect middleware
 */
const doctorOnly = (req, res, next) => {
    if (req.user && req.user.role === 'DOCTOR') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Doctor privileges required.' });
    }
};

/**
 * Middleware to check if user is a patient
 * Must be used AFTER the protect middleware
 */
const patientOnly = (req, res, next) => {
    if (req.user && req.user.role === 'PATIENT') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Patient privileges required.' });
    }
};

/**
 * Middleware to allow multiple roles
 * Usage: authorize(['DOCTOR', 'ADMIN'])
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Role '${req.user.role}' is not authorized.` 
            });
        }

        next();
    };
};

module.exports = { 
    protect, 
    adminOnly, 
    doctorOnly, 
    patientOnly,
    authorize 
};