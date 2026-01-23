// ============================================================
// Authentication Controller - Multi-Role Login System
// Supports: PATIENT, DOCTOR, HOSPITAL_ADMIN, SUPER_ADMIN
// Uses new schema: users table + role-specific profile tables
// ============================================================
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

/**
 * Generate JWT token with user ID and role
 */
const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET || 'aVeryStrongAndSecretKey',
        { expiresIn: '30d' }
    );
};

/**
 * @desc    Universal login for all user types
 * @route   POST /api/auth/login
 * @access  Public
 */
const authUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('🔐 Login Request:', { email, password: password ? '***' : 'MISSING' });

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find user in users table
        const [users] = await pool.execute(
            'SELECT id, email, password, role, is_active FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log('❌ Login failed - User not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        // Check if user is active
        if (!user.is_active) {
            console.log('❌ Login failed - User inactive:', email);
            return res.status(401).json({ message: 'Account is inactive. Please contact support.' });
        }

        console.log('👤 User Found:', {
            id: user.id,
            email: user.email,
            role: user.role
        });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log('❌ Login failed - Password mismatch for:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        console.log('✅ Password match successful for:', email);

        // Get role-specific profile data
        let profileData = {};

        if (user.role === 'PATIENT') {
            const [patients] = await pool.execute(
                'SELECT id, full_name, phone, address, blood_group FROM patients WHERE user_id = ?',
                [user.id]
            );
            if (patients.length > 0) {
                profileData = {
                    profileId: patients[0].id,
                    name: patients[0].full_name,
                    phone: patients[0].phone,
                    address: patients[0].address,
                    bloodGroup: patients[0].blood_group
                };
            }
        } else if (user.role === 'DOCTOR') {
            const [doctors] = await pool.execute(
                'SELECT id, full_name, phone, specialization, hospital_id, consultation_fee FROM doctors WHERE user_id = ?',
                [user.id]
            );
            if (doctors.length > 0) {
                profileData = {
                    profileId: doctors[0].id,
                    name: doctors[0].full_name,
                    phone: doctors[0].phone,
                    specialization: doctors[0].specialization,
                    hospitalId: doctors[0].hospital_id,
                    consultationFee: doctors[0].consultation_fee
                };
            }
        } else if (user.role === 'HOSPITAL_ADMIN') {
            const [admins] = await pool.execute(
                'SELECT id, full_name, phone, hospital_id, designation FROM hospital_admins WHERE user_id = ?',
                [user.id]
            );
            if (admins.length > 0) {
                profileData = {
                    profileId: admins[0].id,
                    name: admins[0].full_name,
                    phone: admins[0].phone,
                    hospitalId: admins[0].hospital_id,
                    designation: admins[0].designation
                };
            }
        } else if (user.role === 'SUPER_ADMIN') {
            const [superAdmins] = await pool.execute(
                'SELECT id, full_name, phone FROM super_admins WHERE user_id = ?',
                [user.id]
            );
            if (superAdmins.length > 0) {
                profileData = {
                    profileId: superAdmins[0].id,
                    name: superAdmins[0].full_name,
                    phone: superAdmins[0].phone
                };
            }
        }

        // Return user data with token
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            ...profileData,
            token: generateToken(user.id, user.role)
        });

        console.log('✅ Login successful:', { email, role: user.role });

    } catch (error) {
        console.error('❌ Login Error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

/**
 * @desc    Register a new patient
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
    const { name, email, password, phone, address } = req.body;

    try {
        console.log('📝 Patient Registration Request:', { name, email, phone });

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password' });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            console.log('❌ Registration failed - Email already exists:', email);
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insert into users table
            const [userResult] = await connection.execute(
                'INSERT INTO users (email, password, role, is_active, is_verified) VALUES (?, ?, ?, ?, ?)',
                [email, hashedPassword, 'PATIENT', true, true]
            );

            const userId = userResult.insertId;

            // Insert into patients table
            const [patientResult] = await connection.execute(
                'INSERT INTO patients (user_id, full_name, phone, address) VALUES (?, ?, ?, ?)',
                [userId, name, phone || null, address || null]
            );

            const patientId = patientResult.insertId;

            await connection.commit();
            connection.release();

            console.log('✅ Patient registered successfully:', { userId, patientId, email });

            res.status(201).json({
                id: userId,
                profileId: patientId,
                name: name,
                email: email,
                phone: phone,
                role: 'PATIENT',
                token: generateToken(userId, 'PATIENT')
            });

        } catch (err) {
            await connection.rollback();
            connection.release();
            throw err;
        }

    } catch (error) {
        console.error('❌ Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
    try {
        // req.user is set by the protect middleware
        const userId = req.user.id;
        const userRole = req.user.role;

        // Get user data from users table
        const [users] = await pool.execute(
            'SELECT id, email, role, is_active, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        let profileData = {};

        // Get role-specific profile
        if (userRole === 'PATIENT') {
            const [patients] = await pool.execute(
                'SELECT id, full_name, phone, address, blood_group, weight, height FROM patients WHERE user_id = ?',
                [userId]
            );
            if (patients.length > 0) {
                profileData = patients[0];
            }
        } else if (userRole === 'DOCTOR') {
            const [doctors] = await pool.execute(
                'SELECT id, full_name, phone, specialization, qualification, bmdc_number, experience_years, consultation_fee, bio, hospital_id FROM doctors WHERE user_id = ?',
                [userId]
            );
            if (doctors.length > 0) {
                profileData = doctors[0];
            }
        } else if (userRole === 'HOSPITAL_ADMIN') {
            const [admins] = await pool.execute(
                'SELECT id, full_name, phone, hospital_id, designation FROM hospital_admins WHERE user_id = ?',
                [userId]
            );
            if (admins.length > 0) {
                profileData = admins[0];
            }
        } else if (userRole === 'SUPER_ADMIN') {
            const [superAdmins] = await pool.execute(
                'SELECT id, full_name, phone FROM super_admins WHERE user_id = ?',
                [userId]
            );
            if (superAdmins.length > 0) {
                profileData = superAdmins[0];
            }
        }

        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            ...profileData,
            created_at: user.created_at
        });

    } catch (error) {
        console.error('❌ Profile Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Update user profile (patients only for now)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
    try {
        const { name, phone, address, blood_group, weight, height, password } = req.body;

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
        if (weight) {
            updates.push('weight = ?');
            values.push(weight);
        }
        if (height) {
            updates.push('height = ?');
            values.push(height);
        }

        if (updates.length === 0 && !password) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        // Update password in users table if provided
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.execute(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, req.user.id]
            );
        }

        // Update profile table
        if (updates.length > 0) {
            values.push(req.user.id);

            await pool.execute(
                `UPDATE patients SET ${updates.join(', ')} WHERE user_id = ?`,
                values
            );
        }

        // Fetch updated profile
        const [patients] = await pool.execute(
            'SELECT id, full_name, phone, address, blood_group, weight, height FROM patients WHERE user_id = ?',
            [req.user.id]
        );

        const [users] = await pool.execute(
            'SELECT email FROM users WHERE id = ?',
            [req.user.id]
        );

        if (patients.length > 0 && users.length > 0) {
            res.json({
                id: req.user.id,
                email: users[0].email,
                name: patients[0].full_name,
                phone: patients[0].phone,
                address: patients[0].address,
                blood_group: patients[0].blood_group,
                weight: patients[0].weight,
                height: patients[0].height,
                role: 'PATIENT',
                token: generateToken(req.user.id, 'PATIENT')
            });
        } else {
            res.status(404).json({ message: 'Profile not found' });
        }
    } catch (error) {
        console.error('❌ Update Profile Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Placeholder for privacy settings (can be implemented later)
const getPrivacySettings = async (req, res) => {
    res.json({ shareHistory: true, visibleToSearch: true });
};

const updatePrivacySettings = async (req, res) => {
    res.json({ message: 'Privacy settings updated successfully' });
};

// @desc    Register a new doctor
// @route   POST /api/auth/register/doctor
// @access  Public
const registerDoctor = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { email, password, fullName, phone, specialization, qualification, bmdcNumber, experienceYears, consultationFee, bio, hospitalId } = req.body;

        // Validation
        if (!email || !password || !fullName || !specialization) {
            return res.status(400).json({ message: 'Please provide email, password, full name, and specialization' });
        }

        // Start transaction
        await connection.beginTransaction();

        // Check if email exists
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in users table
        const [userResult] = await connection.execute(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [email, hashedPassword, 'DOCTOR']
        );

        const userId = userResult.insertId;

        // Create doctor profile
        const [doctorResult] = await connection.execute(
            `INSERT INTO doctors (user_id, full_name, phone, specialization, qualification, bmdc_number, experience_years, consultation_fee, bio, hospital_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, fullName, phone, specialization, qualification || 'MBBS', bmdcNumber, experienceYears || 0, consultationFee || 500, bio, hospitalId]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Doctor registered successfully',
            user: {
                id: doctorResult.insertId,
                userId,
                email,
                fullName,
                role: 'DOCTOR',
                token: generateToken(userId, 'DOCTOR')
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Doctor Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    } finally {
        connection.release();
    }
};

// @desc    Register a new hospital admin
// @route   POST /api/auth/register/hospital-admin
// @access  Public
const registerHospitalAdmin = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { email, password, fullName, phone, hospitalId, designation } = req.body;

        // Validation
        if (!email || !password || !fullName || !hospitalId) {
            return res.status(400).json({ message: 'Please provide email, password, full name, and hospital ID' });
        }

        // Start transaction
        await connection.beginTransaction();

        // Check if email exists
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in users table
        const [userResult] = await connection.execute(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [email, hashedPassword, 'HOSPITAL_ADMIN']
        );

        const userId = userResult.insertId;

        // Create hospital admin profile
        const [adminResult] = await connection.execute(
            'INSERT INTO hospital_admins (user_id, full_name, phone, hospital_id, designation) VALUES (?, ?, ?, ?, ?)',
            [userId, fullName, phone, hospitalId, designation || 'Administrator']
        );

        await connection.commit();

        res.status(201).json({
            message: 'Hospital admin registered successfully',
            user: {
                id: adminResult.insertId,
                userId,
                email,
                fullName,
                role: 'HOSPITAL_ADMIN',
                hospitalId,
                token: generateToken(userId, 'HOSPITAL_ADMIN')
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Hospital Admin Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    registerUser,
    authUser,
    getUserProfile,
    updateUserProfile,
    getPrivacySettings,
    updatePrivacySettings,
    registerDoctor,
    registerHospitalAdmin
};