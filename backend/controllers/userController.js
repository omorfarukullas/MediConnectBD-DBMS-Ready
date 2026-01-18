// ============================================================
// User/Patient Controller - Raw SQL Implementation
// Using mysql2/promise with parameterized queries
// ============================================================
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

/**
 * Generate JWT token with user ID and role
 * @param {number} id - User ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
const generateToken = (id, role) => {
    return jwt.sign(
        { id, role }, 
        process.env.JWT_SECRET || 'aVeryStrongAndSecretKey', 
        { expiresIn: '30d' }
    );
};

// @desc    Register a new patient
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    const { name, email, password, phone, address } = req.body;

    try {
        // DEBUG: Log registration attempt
        console.log('📝 Patient Registration Request:', { name, email, phone, passwordLength: password?.length });
        
        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password' });
        }

        // Check if patient already exists in patients table
        const [existingPatients] = await pool.execute(
            'SELECT id FROM patients WHERE email = ?',
            [email]
        );

        if (existingPatients.length > 0) {
            console.log('❌ Registration failed - Email already exists:', email);
            return res.status(400).json({ message: 'Patient already exists with this email' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into patients table
        const [result] = await pool.execute(
            'INSERT INTO patients (full_name, email, password, phone, address) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone || null, address || null]
        );

        const patientId = result.insertId;
        console.log('✅ Patient registered successfully:', { id: patientId, email: email });
        
        res.status(201).json({
            id: patientId,
            name: name,
            email: email,
            phone: phone,
            role: 'PATIENT',
            token: generateToken(patientId, 'PATIENT')
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

// @desc    Auth patient & get token
// @route   POST /api/auth/login
const authUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // DEBUG: Log incoming request
        console.log('🔐 Patient Login Request:', { email, password: password ? '***' + password.slice(-3) : 'MISSING' });
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find patient by email in patients table
        const [patients] = await pool.execute(
            'SELECT id, full_name, email, password, phone, address FROM patients WHERE email = ?',
            [email]
        );

        if (patients.length === 0) {
            console.log('❌ Login failed - Patient not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const patient = patients[0];
        
        // DEBUG: Log patient lookup result
        console.log('👤 Patient Found in DB:', { 
            id: patient.id, 
            email: patient.email, 
            hashedPassword: patient.password.substring(0, 20) + '...'
        });

        // Check password
        const isMatch = await bcrypt.compare(password, patient.password);

        if (isMatch) {
            console.log('✅ Password match successful for:', email);
            res.json({
                id: patient.id,
                name: patient.full_name,
                email: patient.email,
                phone: patient.phone,
                address: patient.address,
                role: 'PATIENT',
                token: generateToken(patient.id, 'PATIENT')
            });
        } else {
            console.log('❌ Login failed - Password mismatch for:', email);
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

// @desc    Get current patient profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        // req.user is set by the protect middleware
        const [patients] = await pool.execute(
            'SELECT id, full_name, email, phone, address, blood_group, created_at FROM patients WHERE id = ?',
            [req.user.id]
        );

        if (patients.length > 0) {
            const patient = patients[0];
            res.json({
                id: patient.id,
                name: patient.full_name,
                email: patient.email,
                phone: patient.phone,
                address: patient.address,
                bloodGroup: patient.blood_group,
                role: 'PATIENT'
            });
        } else {
            res.status(404).json({ message: 'Patient not found' });
        }
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update patient profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const { name, phone, address, blood_group } = req.body;
        
        // Build update query dynamically
        const updates = [];
        const values = [];
        
        if (name) {
            updates.push('full_name = ?');
            values.push(name);
        }
        if (phone) {
            updates.push('phone = ?');
            values.push(phone);
        }
        if (address) {
            updates.push('address = ?');
            values.push(address);
        }
        if (blood_group) {
            updates.push('blood_group = ?');
            values.push(blood_group);
        }
        if (req.body.password) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            updates.push('password = ?');
            values.push(hashedPassword);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        
        values.push(req.user.id);
        
        await pool.execute(
            `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Fetch updated patient
        const [patients] = await pool.execute(
            'SELECT id, full_name, email, phone, address, blood_group FROM patients WHERE id = ?',
            [req.user.id]
        );

        if (patients.length > 0) {
            const patient = patients[0];
            res.json({
                id: patient.id,
                name: patient.full_name,
                email: patient.email,
                phone: patient.phone,
                address: patient.address,
                blood_group: patient.blood_group,
                role: 'PATIENT',
                token: generateToken(patient.id, 'PATIENT')
            });
        } else {
            res.status(404).json({ message: 'Patient not found' });
        }
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get patient privacy settings
// @route   GET /api/auth/privacy
// @access  Private
const getPrivacySettings = async (req, res) => {
    try {
        const [patients] = await pool.execute(
            'SELECT share_medical_history, visible_in_search FROM patients WHERE id = ?',
            [req.user.id]
        );

        if (patients.length > 0) {
            res.json({
                shareHistory: patients[0].share_medical_history === 1,
                visibleToSearch: patients[0].visible_in_search === 1
            });
        } else {
            res.status(404).json({ message: 'Patient not found' });
        }
    } catch (error) {
        console.error('Get Privacy Settings Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update patient privacy settings
// @route   PUT /api/auth/privacy
// @access  Private
const updatePrivacySettings = async (req, res) => {
    try {
        const { shareHistory, visibleToSearch } = req.body;
        
        console.log('🔒 Updating privacy settings for patient:', req.user.id);
        console.log('User role:', req.user.role);
        console.log('Settings:', { shareHistory, visibleToSearch });
        
        // Ensure user is a patient
        if (req.user.role !== 'PATIENT') {
            return res.status(403).json({ message: 'Only patients can update privacy settings' });
        }
        
        const [result] = await pool.execute(
            'UPDATE patients SET share_medical_history = ?, visible_in_search = ? WHERE id = ?',
            [shareHistory ? 1 : 0, visibleToSearch ? 1 : 0, req.user.id]
        );

        console.log('✅ Privacy settings update result:', result);
        console.log('Rows affected:', result.affectedRows);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        res.json({
            message: 'Privacy settings updated successfully',
            shareHistory,
            visibleToSearch
        });
    } catch (error) {
        console.error('Update Privacy Settings Error:', error);
        console.error('Error details:', error.message, error.sqlMessage);
        res.status(500).json({ 
            message: 'Server error updating privacy settings', 
            error: error.message,
            details: error.sqlMessage 
        });
    }
};

module.exports = { 
    registerUser, 
    authUser, 
    getUserProfile, 
    updateUserProfile,
    getPrivacySettings,
    updatePrivacySettings
};