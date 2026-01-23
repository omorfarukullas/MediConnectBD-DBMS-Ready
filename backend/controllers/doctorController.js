// ============================================================
// Doctor Controller - Raw SQL Implementation
// Using mysql2/promise with parameterized queries
// ============================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Generate JWT Token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'aVeryStrongAndSecretKey', {
        expiresIn: '30d'
    });
};

// NOTE: Doctor registration has been moved to userController.js
// Use POST /api/auth/register/doctor for doctor registration
// This uses the new schema with users table + doctors profile table

// @desc    Get all doctors with filters
// @route   GET /api/doctors
const getDoctors = async (req, res) => {
    try {
        console.log('🏥 GET /api/doctors - Fetching doctors list');
        const { search, specialty, hospital, city } = req.query;

        // Build WHERE clause dynamically
        const conditions = [];
        const replacements = [];

        if (specialty && specialty !== 'All Specialties') {
            conditions.push('specialization = ?');
            replacements.push(specialty);
        }
        if (city) {
            conditions.push('city = ?');
            replacements.push(city);
        }
        if (search) {
            conditions.push('(full_name LIKE ? OR specialization LIKE ?)');
            replacements.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        console.log('🔍 Query filters:', { specialty, city, search });

        const [doctors] = await pool.execute(
            `SELECT * FROM doctors ${whereClause} ORDER BY id ASC`,
            replacements
        );

        console.log(`✅ Found ${doctors.length} doctors in database`);

        // Format data for frontend
        const formattedDoctors = doctors.map(doc => ({
            id: doc.id,
            name: doc.full_name || 'Unknown Doctor',
            email: doc.email || '',
            phone: doc.phone || '',
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.full_name || 'Doctor')}&background=0D8ABC&color=fff`,
            specialization: doc.specialization || 'General Medicine',
            hospital: 'Not specified',
            location: doc.city || 'Dhaka',
            fees: {
                online: parseFloat(doc.consultation_fee || 0),
                physical: parseFloat(doc.consultation_fee || 0)
            },
            degrees: doc.qualification ? doc.qualification.split(',').map(d => d.trim()) : ['MBBS'],
            languages: ['Bangla', 'English'],
            rating: 4.5,
            isVerified: false,
            available: false
        }));

        console.log('📤 Sending formatted doctors:', formattedDoctors.slice(0, 2));
        res.json(formattedDoctors);
    } catch (error) {
        console.error('❌ getDoctors Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const getDoctorById = async (req, res) => {
    try {
        const [doctors] = await pool.execute(
            'SELECT * FROM doctors WHERE id = ?',
            [req.params.id]
        );

        if (doctors.length > 0) {
            const doc = doctors[0];
            res.json({
                id: doc.id,
                name: doc.full_name,
                email: doc.email,
                phone: doc.phone,
                specialization: doc.specialization,
                city: doc.city,
                qualification: doc.qualification,
                experience_years: doc.experience_years,
                consultation_fee: doc.consultation_fee,
                bio: doc.bio,
                created_at: doc.created_at
            });
        } else {
            res.status(404).json({ message: 'Doctor not found' });
        }
    } catch (error) {
        console.error('❌ getDoctorById Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Auth doctor & get token
// @route   POST /api/doctors/login
const authDoctor = async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('🔐 Doctor Login Request:', { email, password: password ? '***' + password.slice(-3) : 'MISSING' });

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Step 1: Find user by email in users table and verify role is DOCTOR
        const [users] = await pool.execute(
            'SELECT id, email, password, role FROM users WHERE email = ? AND role = ?',
            [email, 'DOCTOR']
        );

        if (users.length === 0) {
            console.log('❌ Login failed - Doctor user not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        console.log('👤 Doctor User Found in DB:', {
            userId: user.id,
            email: user.email,
            role: user.role
        });

        // Step 2: Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log('❌ Login failed - Password mismatch for:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        console.log('✅ Password match successful for:', email);

        // Step 3: Fetch doctor profile data from doctors table
        const [doctors] = await pool.execute(
            `SELECT d.id, d.user_id, d.full_name, d.phone, d.specialization, d.qualification, 
                    d.bmdc_number, d.consultation_fee, d.experience_years, d.bio, d.hospital_id, 
                    h.name as hospital_name, h.city
             FROM doctors d
             LEFT JOIN hospitals h ON d.hospital_id = h.id
             WHERE d.user_id = ?`,
            [user.id]
        );

        if (doctors.length === 0) {
            console.log('❌ Doctor profile not found for user_id:', user.id);
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        const doctor = doctors[0];

        console.log('👨‍⚕️ Doctor Profile Found:', {
            doctorId: doctor.id,
            name: doctor.full_name,
            hospital: doctor.hospital_name
        });

        // Step 4: Return user data with JWT token
        res.json({
            id: doctor.id,
            userId: user.id,
            name: doctor.full_name,
            email: user.email,
            phone: doctor.phone,
            specialization: doctor.specialization,
            qualification: doctor.qualification,
            bmdcNumber: doctor.bmdc_number,
            consultationFee: doctor.consultation_fee,
            experienceYears: doctor.experience_years,
            bio: doctor.bio,
            hospitalId: doctor.hospital_id,
            hospitalName: doctor.hospital_name,
            city: doctor.city,
            role: 'DOCTOR',
            token: generateToken(user.id, 'DOCTOR')
        });

    } catch (error) {
        console.error('❌ Doctor Login Error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

module.exports = { authDoctor, getDoctors, getDoctorById };