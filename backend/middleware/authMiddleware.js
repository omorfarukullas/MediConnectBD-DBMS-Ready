const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Middleware to protect routes - verifies JWT token
 * Works with new schema: users table + role-specific profile tables
 * Supports: PATIENT, DOCTOR, HOSPITAL_ADMIN, SUPER_ADMIN
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token from "Bearer <token>"
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aVeryStrongAndSecretKey');

            console.log('🔐 Token decoded:', { userId: decoded.id, role: decoded.role });

            // Get user from users table
            const [users] = await pool.execute(
                'SELECT id, email, role, is_active FROM users WHERE id = ?',
                [decoded.id]
            );

            if (users.length === 0) {
                console.log('❌ User not found in users table');
                return res.status(401).json({ message: 'User not found' });
            }

            const user = users[0];

            // Check if user is active
            if (!user.is_active) {
                console.log('❌ User account is inactive');
                return res.status(401).json({ message: 'Account is inactive' });
            }

            // Get role-specific profile data
            let profileData = null;

            if (user.role === 'PATIENT') {
                const [patients] = await pool.execute(
                    'SELECT id as profile_id, full_name as name, phone,address, blood_group FROM patients WHERE user_id = ?',
                    [user.id]
                );
                profileData = patients[0];
            } else if (user.role === 'DOCTOR') {
                const [doctors] = await pool.execute(
                    'SELECT id as profile_id, full_name as name, phone, specialization, hospital_id FROM doctors WHERE user_id = ?',
                    [user.id]
                );
                profileData = doctors[0];
            } else if (user.role === 'HOSPITAL_ADMIN') {
                const [admins] = await pool.execute(
                    'SELECT id as profile_id, full_name as name, phone, hospital_id, designation FROM hospital_admins WHERE user_id = ?',
                    [user.id]
                );
                profileData = admins[0];
            } else if (user.role === 'SUPER_ADMIN') {
                const [superAdmins] = await pool.execute(
                    'SELECT id as profile_id, full_name as name, phone FROM super_admins WHERE user_id = ?',
                    [user.id]
                );
                profileData = superAdmins[0];
            }

            if (!profileData) {
                console.log('❌ Profile not found for user');
                return res.status(401).json({ message: 'User profile not found' });
            }

            // Attach user data with role to request
            req.user = {
                id: user.id,  // User ID from users table
                email: user.email,
                role: user.role,
                ...profileData  // Includes profile_id, name, phone, etc.
            };

            console.log('✅ User authenticated:', {
                userId: req.user.id,
                profileId: req.user.profile_id,
                role: req.user.role,
                name: req.user.name
            });

            next();
        } catch (error) {
            console.error('❌ Auth Error:', error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

/**
 * Middleware to check if user is a Super Admin
 */
const superAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
    }
};

/**
 * Middleware to check if user is a Hospital Admin
 */
const hospitalAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'HOSPITAL_ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Hospital Admin privileges required.' });
    }
};

/**
 * Middleware to check if user is a doctor
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
 * Usage: authorize('DOCTOR', 'HOSPITAL_ADMIN')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Role '${req.user.role}' is not authorized for this action.`
            });
        }

        next();
    };
};

module.exports = {
    protect,
    superAdminOnly,
    hospitalAdminOnly,
    doctorOnly,
    patientOnly,
    authorize,
    restrictTo: authorize // Alias for authorize
};