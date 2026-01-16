const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Patient, DoctorNew } = require('../models');
const { validatePatientRegistration, validateDoctorRegistration, validateLogin } = require('../middleware/validationMiddleware');

// ===== PATIENT REGISTRATION =====
router.post('/patient/register', validatePatientRegistration, async (req, res) => {
    try {
        const { full_name, email, password, phone, address } = req.body;

        // Check if patient exists
        const existingPatient = await Patient.findOne({ where: { email } });
        if (existingPatient) {
            return res.status(400).json({ 
                success: false,
                message: 'Email already registered. Please use a different email or login.' 
            });
        }

        // Create patient
        const patient = await Patient.create({
            full_name,
            email,
            password,
            phone,
            address
        });

        // Generate token
        const token = jwt.sign(
            { id: patient.id, email: patient.email, role: 'PATIENT' },
            process.env.JWT_SECRET || 'aVeryStrongAndSecretKey',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Patient registered successfully! You can now login.',
            token,
            patient: {
                id: patient.id,
                full_name: patient.full_name,
                email: patient.email,
                phone: patient.phone,
                address: patient.address
            }
        });
    } catch (error) {
        console.error('Patient registration error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during registration', 
            error: error.message 
        });
    }
});

// ===== PATIENT LOGIN =====
router.post('/patient/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find patient
        const patient = await Patient.findOne({ where: { email } });
        if (!patient) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Check password
        const isMatch = await patient.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: patient.id, email: patient.email, role: 'PATIENT' },
            process.env.JWT_SECRET || 'aVeryStrongAndSecretKey',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful! Welcome back.',
            token,
            patient: {
                id: patient.id,
                full_name: patient.full_name,
                email: patient.email,
                phone: patient.phone,
                address: patient.address
            }
        });
    } catch (error) {
        console.error('Patient login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login', 
            error: error.message 
        });
    }
});

// ===== DOCTOR REGISTRATION =====
router.post('/doctor/register', validateDoctorRegistration, async (req, res) => {
    console.log('🏥 [API] Doctor registration request received');
    console.log('📋 [API] Request body:', { ...req.body, password: '***' });
    
    try {
        const { full_name, email, password, phone, city, specialization, hospital, visit_fee } = req.body;

        // Check if doctor exists
        console.log('🔍 [API] Checking for existing doctor with email:', email);
        const existingDoctor = await DoctorNew.findOne({ where: { email } });
        if (existingDoctor) {
            console.log('⚠️ [API] Doctor already exists with this email');
            return res.status(400).json({ 
                success: false,
                message: 'Email already registered. Please use a different email or login.' 
            });
        }

        // Create doctor
        console.log('➕ [API] Creating new doctor in database...');
        const doctor = await DoctorNew.create({
            full_name,
            email,
            password,
            phone,
            city,
            specialization,
            hospital: hospital || 'Private Practice',
            visit_fee: visit_fee || 500
        });
        console.log('✅ [API] Doctor created successfully with ID:', doctor.id);

        // Generate token
        const token = jwt.sign(
            { id: doctor.id, email: doctor.email, role: 'DOCTOR' },
            process.env.JWT_SECRET || 'aVeryStrongAndSecretKey',
            { expiresIn: '7d' }
        );
        console.log('🔑 [API] JWT token generated for doctor');

        const responseData = {
            success: true,
            message: 'Doctor registered successfully! You can now login.',
            token,
            id: doctor.id,
            name: doctor.full_name,
            email: doctor.email,
            phone: doctor.phone,
            role: 'DOCTOR',
            doctor: {
                id: doctor.id,
                full_name: doctor.full_name,
                email: doctor.email,
                phone: doctor.phone,
                city: doctor.city,
                specialization: doctor.specialization,
                hospital: doctor.hospital,
                visit_fee: doctor.visit_fee
            }
        };
        
        console.log('📤 [API] Sending success response');
        res.status(201).json(responseData);
    } catch (error) {
        console.error('❌ [API] Doctor registration error:', error);
        console.error('❌ [API] Error stack:', error.stack);
        res.status(500).json({ 
            success: false,
            message: 'Server error during registration', 
            error: error.message 
        });
    }
});

// ===== DOCTOR LOGIN =====
router.post('/doctor/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find doctor
        const doctor = await DoctorNew.findOne({ where: { email } });
        if (!doctor) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Check password
        const isMatch = await doctor.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: doctor.id, email: doctor.email, role: 'DOCTOR' },
            process.env.JWT_SECRET || 'aVeryStrongAndSecretKey',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful! Welcome back.',
            token,
            doctor: {
                id: doctor.id,
                full_name: doctor.full_name,
                email: doctor.email,
                phone: doctor.phone,
                city: doctor.city,
                specialization: doctor.specialization
            }
        });
    } catch (error) {
        console.error('Doctor login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login', 
            error: error.message 
        });
    }
});

module.exports = router;

// ===== UNIFIED LOGIN ENDPOINT (Detects User Type Automatically) =====
router.post('/login', validateLogin, async (req, res) => {
    console.log('🔐 [API] Unified login request received');
    console.log('📧 [API] Email:', req.body.email);
    
    try {
        const { email, password } = req.body;

        // Try to find user in both tables
        let user = null;
        let userType = null;

        // Check if it's a doctor
        const doctor = await DoctorNew.findOne({ where: { email } });
        if (doctor) {
            user = doctor;
            userType = 'DOCTOR';
            console.log('👨‍⚕️ [API] Found doctor account');
        }

        // If not a doctor, check if it's a patient
        if (!user) {
            const patient = await Patient.findOne({ where: { email } });
            if (patient) {
                user = patient;
                userType = 'PATIENT';
                console.log('👤 [API] Found patient account');
            }
        }

        // User not found in either table
        if (!user) {
            console.log('❌ [API] No account found with this email');
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password. Please check your credentials.' 
            });
        }

        // Verify password
        console.log('🔍 [API] Verifying password...');
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('❌ [API] Invalid password');
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password. Please check your credentials.' 
            });
        }

        // Generate JWT token
        console.log('🔑 [API] Generating JWT token for', userType);
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: userType,
                name: user.full_name 
            },
            process.env.JWT_SECRET || 'aVeryStrongAndSecretKey',
            { expiresIn: '7d' }
        );

        // Prepare response based on user type
        let responseData = {
            success: true,
            message: `Welcome back, ${user.full_name}!`,
            token,
            id: user.id,
            name: user.full_name,
            email: user.email,
            phone: user.phone,
            role: userType
        };

        // Add role-specific data
        if (userType === 'DOCTOR') {
            responseData.city = user.city;
            responseData.specialization = user.specialization;
            responseData.hospital = user.hospital;
            responseData.visit_fee = parseFloat(user.visit_fee) || 0;
        } else if (userType === 'PATIENT') {
            responseData.address = user.address;
        }

        console.log('✅ [API] Login successful for', userType);
        res.json(responseData);
    } catch (error) {
        console.error('❌ [API] Login error:', error);
        console.error('❌ [API] Error stack:', error.stack);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login. Please try again later.', 
            error: error.message 
        });
    }
});
