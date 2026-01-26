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

        // Build WHERE clause dynamically with table aliases
        const conditions = [];
        const replacements = [];

        if (specialty && specialty !== 'All Specialties') {
            conditions.push('d.specialization = ?');
            replacements.push(specialty);
        }
        if (city) {
            conditions.push('h.city = ?');
            replacements.push(city);
        }
        if (search) {
            conditions.push('(d.full_name LIKE ? OR d.specialization LIKE ?)');
            replacements.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        console.log('🔍 Query filters:', { specialty, city, search });

        const [doctors] = await pool.execute(
            `SELECT d.*, u.email, h.name as hospital_name, h.city
             FROM doctors d
             LEFT JOIN users u ON d.user_id = u.id
             LEFT JOIN hospitals h ON d.hospital_id = h.id
             ${whereClause} 
             ORDER BY d.id ASC`,
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
            hospital: doc.hospital_name || 'Not specified',
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
            `SELECT d.*, u.email
             FROM doctors d
             LEFT JOIN users u ON d.user_id = u.id
             WHERE d.id = ?`,
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

/**
 * @desc    Get doctor's earnings summary
 * @route   GET /api/doctors/earnings
 * @access  Private (Doctor only)
 */
const getDoctorEarnings = async (req, res) => {
    try {
        const doctorId = req.user.profile_id; // Doctor's profile ID from auth middleware

        console.log('💰 Fetching earnings for Doctor ID:', doctorId);

        // Get doctor's consultation fee
        const [doctors] = await pool.execute(
            'SELECT consultation_fee FROM doctors WHERE id = ?',
            [doctorId]
        );

        if (doctors.length === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const consultationFee = parseFloat(doctors[0].consultation_fee || 0);

        // Get completed appointments breakdown by type
        const [stats] = await pool.execute(
            `SELECT 
                consultation_type,
                COUNT(*) as count
             FROM appointments
             WHERE doctor_id = ? AND status = 'COMPLETED'
             GROUP BY consultation_type`,
            [doctorId]
        );

        // Calculate earnings by type
        let telemedicineCount = 0;
        let physicalCount = 0;

        stats.forEach(stat => {
            if (stat.consultation_type === 'TELEMEDICINE') {
                telemedicineCount = stat.count;
            } else {
                physicalCount = stat.count;
            }
        });

        const telemedicineEarnings = telemedicineCount * consultationFee;
        const physicalEarnings = physicalCount * consultationFee;
        const totalEarnings = telemedicineEarnings + physicalEarnings;

        // Get recent completed appointments for transaction history
        const [transactions] = await pool.execute(
            `SELECT 
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.consultation_type,
                a.completed_at,
                p.full_name as patient_name
             FROM appointments a
             LEFT JOIN patients p ON a.patient_id = p.id
             WHERE a.doctor_id = ? AND a.status = 'COMPLETED'
             ORDER BY a.completed_at DESC
             LIMIT 20`,
            [doctorId]
        );

        const formattedTransactions = transactions.map(t => ({
            id: t.id,
            date: t.appointment_date,
            time: t.appointment_time,
            patientName: t.patient_name || 'Unknown Patient',
            service: t.consultation_type === 'TELEMEDICINE' ? 'Online Consultation' : 'Physical Visit',
            amount: consultationFee,
            status: 'Paid',
            completedAt: t.completed_at
        }));

        res.json({
            totalEarnings,
            telemedicine: {
                count: telemedicineCount,
                earnings: telemedicineEarnings
            },
            physical: {
                count: physicalCount,
                earnings: physicalEarnings
            },
            consultationFee,
            transactions: formattedTransactions
        });

        console.log('✅ Earnings calculated:', { totalEarnings, telemedicineCount, physicalCount });

    } catch (error) {
        console.error('❌ getDoctorEarnings Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { authDoctor, getDoctors, getDoctorById, getDoctorEarnings };
