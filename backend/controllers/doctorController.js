const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db');

// Generate JWT Token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'mediconnect_secret_key_2024', {
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
        const [existingDoctors] = await sequelize.query(
            'SELECT * FROM doctors WHERE email = ?',
            { replacements: [email] }
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

        // Parse degrees/education - handle both string and array
        let educationArray = [];
        if (degrees) {
            if (Array.isArray(degrees)) {
                educationArray = degrees;
            } else if (typeof degrees === 'string') {
                educationArray = degrees.split(',').map(d => d.trim()).filter(d => d);
            }
        }

        // Insert into doctors table with all fields
        const [result] = await sequelize.query(
            `INSERT INTO doctors (
                full_name, email, password, phone, city, specialization,
                bmdcNumber, experienceYears, hospitalName, education,
                feesOnline, feesPhysical, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            { 
                replacements: [
                    name,
                    email,
                    hashedPassword,
                    phone || null,
                    city || 'Dhaka',
                    specialization,
                    bmdcNumber || null,
                    parseInt(experience) || 0,
                    hospital || null,
                    educationArray.length > 0 ? JSON.stringify(educationArray) : null,
                    parseFloat(onlineFee) || 0,
                    parseFloat(physicalFee) || 0,
                    'Active'
                ] 
            }
        );

        console.log('✅ Doctor registered successfully:', { id: result, email: email });

        res.status(201).json({
            success: true,
            message: 'Doctor registration successful',
            data: {
                id: result,
                name: name,
                email: email,
                specialization: specialization,
                city: city
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

        const [doctors] = await sequelize.query(
            `SELECT * FROM doctors ${whereClause} ORDER BY id ASC`,
            { replacements }
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
            hospital: doc.hospitalName || doc.hospital || 'Not specified',
            location: doc.city || 'Dhaka',
            fees: { 
                online: parseFloat(doc.feesOnline || doc.visit_fee || 0), 
                physical: parseFloat(doc.feesPhysical || doc.visit_fee || 0)
            },
            degrees: Array.isArray(doc.education) ? doc.education : ['MBBS'],
            languages: ['Bangla', 'English'],
            rating: parseFloat(doc.rating || 4.5),
            isVerified: doc.isVerified ? true : false,
            available: doc.available ? true : false
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
        const [doctors] = await sequelize.query(
            'SELECT * FROM doctors WHERE id = ?',
            { replacements: [req.params.id] }
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
                hospital: doc.hospital,
                visit_fee: doc.visit_fee,
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
        const [doctors] = await sequelize.query(
            'SELECT * FROM doctors WHERE email = ?',
            { replacements: [email] }
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