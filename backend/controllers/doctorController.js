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

// @desc    Register a new doctor
// @route   POST /api/doctors/register
const registerDoctor = async (req, res) => {
    console.log('👨‍⚕️ Doctor Registration Request Received');
    console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));

    const {
        name,
        email,
        phone,
        password,
        city,
        specialization,
        bmdcNumber,
        experience,
        hospital,
        degrees,
        onlineFee,
        physicalFee,
        gender,
        dateOfBirth
    } = req.body;

    // Validation
    if (!name || !email || !password || !specialization) {
        console.log('❌ Validation Failed - Missing required fields');
        return res.status(400).json({
            success: false,
            message: 'Please provide: name, email, password, and specialization'
        });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('❌ Validation Failed - Invalid email format:', email);
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address (e.g., doctor@example.com)'
        });
    }

    try {
        // Check if email already exists in doctors table
        const [existingDoctors] = await pool.execute(
            'SELECT id FROM doctors WHERE email = ?',
            [email]
        );

        if (existingDoctors.length > 0) {
            console.log('❌ Registration Failed - Email already exists:', email);
            return res.status(400).json({
                success: false,
                message: 'A doctor with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Parse degrees/education
        let qualificationText = '';
        if (degrees) {
            if (Array.isArray(degrees)) {
                qualificationText = degrees.join(', ');
            } else if (typeof degrees === 'string') {
                qualificationText = degrees;
            }
        }

        // Insert into doctors table (matching actual schema columns)
        const [result] = await pool.execute(
            `INSERT INTO doctors (
                full_name, email, password, phone, city, specialization,
                qualification, experience_years, consultation_fee, bio
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                email,
                hashedPassword,
                phone || null,
                city || 'Dhaka',
                specialization,
                qualificationText || 'MBBS',
                parseInt(experience) || 0,
                parseFloat(onlineFee || physicalFee) || 500.00,
                `Experienced ${specialization} at ${hospital || 'Hospital'}` || null
            ]
        );

        const doctorId = result.insertId;
        console.log('✅ Doctor registered successfully:', { id: doctorId, email: email });

        res.status(201).json({
            success: true,
            message: 'Doctor registration successful',
            data: {
                id: doctorId,
                name: name,
                email: email,
                specialization: specialization,
                city: city,
                token: generateToken(doctorId, 'DOCTOR')
            }
        });

    } catch (error) {
        console.error('❌ Doctor Registration Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message
        });
    }
};

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

        // Find doctor by email in doctors table
        const [doctors] = await pool.execute(
            'SELECT id, full_name, email, password, phone, specialization, city FROM doctors WHERE email = ?',
            [email]
        );

        if (doctors.length === 0) {
            console.log('❌ Login failed - Doctor not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const doctor = doctors[0];
        
        console.log('👨‍⚕️ Doctor Found in DB:', { 
            id: doctor.id, 
            email: doctor.email,
            name: doctor.full_name
        });

        // Check password
        const isMatch = await bcrypt.compare(password, doctor.password);

        if (isMatch) {
            console.log('✅ Password match successful for:', email);
            res.json({
                id: doctor.id,
                name: doctor.full_name,
                email: doctor.email,
                phone: doctor.phone,
                specialization: doctor.specialization,
                city: doctor.city,
                role: 'DOCTOR',
                token: generateToken(doctor.id, 'DOCTOR')
            });
        } else {
            console.log('❌ Login failed - Password mismatch for:', email);
            res.status(401).json({ message: 'Invalid email or password' });
        }

    } catch (error) {
        console.error('❌ Doctor Login Error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

module.exports = { registerDoctor, authDoctor, getDoctors, getDoctorById };