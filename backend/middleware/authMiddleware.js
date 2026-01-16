const jwt = require('jsonwebtoken');
const { User } = require('../models');

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
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
            
            // Get user from token (exclude password)
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password'] }
            });

            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

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