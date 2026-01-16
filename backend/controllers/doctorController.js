const { Doctor, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

// @desc    Register a new doctor (User + Doctor record)
// @route   POST /api/doctors/register
const registerDoctor = async (req, res) => {
    console.log('👨‍⚕️ Doctor Registration Request Received');
    console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));

    const {
        // User fields
        name,
        email,
        phone,
        password,
        gender,
        dateOfBirth,
        // Doctor fields
        bmdcNumber,
        specialization,
        subSpecialization,
        experience,
        hospital,
        degrees,
        consultationFee,
        onlineFee,
        physicalFee
    } = req.body;

    // Validation
    if (!name || !email || !password || !bmdcNumber || !specialization) {
        console.log('❌ Validation Failed - Missing required fields');
        return res.status(400).json({
            success: false,
            message: 'Please provide: name, email, password, bmdcNumber, and specialization'
        });
    }

    // Use database transaction to ensure both User and Doctor are created atomically
    const t = await sequelize.transaction();

    try {
        // Step 1: Check if email already exists
        const existingUser = await User.findOne({ where: { email }, transaction: t });
        if (existingUser) {
            await t.rollback();
            console.log('❌ Registration Failed - Email already exists:', email);
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        // Step 2: Check if BMDC number already exists
        const existingDoctor = await Doctor.findOne({ where: { bmdcNumber }, transaction: t });
        if (existingDoctor) {
            await t.rollback();
            console.log('❌ Registration Failed - BMDC number already exists:', bmdcNumber);
            return res.status(400).json({
                success: false,
                message: 'A doctor with this BMDC number is already registered'
            });
        }

        // Step 3: Create User record
        console.log('📝 Creating User record...');
        const user = await User.create({
            name,
            email,
            phone,
            password, // Will be auto-hashed by User model hook
            role: 'DOCTOR',
            gender,
            dateOfBirth
        }, { transaction: t });

        console.log('✅ User created with ID:', user.id);

        // Step 4: Create Doctor record linked to User
        console.log('📝 Creating Doctor record...');
        const doctor = await Doctor.create({
            userId: user.id,
            full_name: name, // Legacy database requirement
            email: email, // Legacy database requirement
            phone: phone, // Legacy database requirement
            password: password, // Legacy database requirement (will be stored in both User and Doctor tables)
            city: hospital || 'Dhaka', // Legacy database requirement
            bmdcNumber,
            specialization,
            subSpecialization: subSpecialization || null,
            experienceYears: parseInt(experience) || 0,
            hospitalName: hospital || null,
            education: degrees ? degrees.split(',').map(d => d.trim()) : [],
            feesOnline: parseInt(onlineFee) || parseInt(consultationFee) || 0,
            feesPhysical: parseInt(physicalFee) || parseInt(consultationFee) || 0,
            available: true,
            isVerified: false, // Super Admin must verify
            status: 'Inactive' // Will be activated after verification
        }, { transaction: t });

        console.log('✅ Doctor record created with ID:', doctor.id);

        // Step 5: Commit transaction
        await t.commit();

        console.log('🎉 Doctor registration successful!');
        console.log('📊 Summary:', {
            userId: user.id,
            doctorId: doctor.id,
            email: user.email,
            bmdcNumber: doctor.bmdcNumber,
            status: doctor.status
        });

        // Step 6: Return standardized API response (API-First Architecture)
        res.status(201).json({
            success: true,
            message: 'Doctor registration submitted successfully. Pending verification.',
            data: {
                userId: user.id,
                doctorId: doctor.id,
                name: user.name,
                email: user.email,
                bmdcNumber: doctor.bmdcNumber,
                specialization: doctor.specialization,
                status: doctor.status,
                isVerified: doctor.isVerified
            }
        });

    } catch (error) {
        // Rollback transaction on error
        await t.rollback();
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
        const { search, specialty, hospital } = req.query;
        
        let whereClause = {};

        // Filter by status if column exists
        if (specialty && specialty !== 'All Specialties') {
            whereClause.specialization = specialty;
        }
        if (hospital && hospital !== 'All Hospitals') {
            whereClause.hospitalName = hospital;
        }

        console.log('🔍 Query filters:', whereClause);

        const doctors = await Doctor.findAll({
            where: whereClause,
            include: [{
                model: User,
                attributes: ['id', 'name', 'email', 'phone', 'image'],
                required: false // LEFT JOIN to handle doctors without User link
            }],
            order: [['id', 'ASC']],
            raw: false, // Keep Sequelize instances for proper data access
            nest: true  // Nest associations
        });

        console.log(`✅ Found ${doctors.length} doctors in database`);

        // Format data for frontend - handle both legacy and new structure
        const formattedDoctors = doctors.map(doc => {
            const userData = doc.User || {};
            // Access dataValues for legacy fields not in model
            const rawData = doc.dataValues || doc;
            
            return {
                id: doc.id,
                name: userData.name || rawData.full_name || 'Unknown Doctor',
                email: userData.email || rawData.email || '',
                phone: userData.phone || rawData.phone || '',
                image: userData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || rawData.full_name || 'Doctor')}&background=0D8ABC&color=fff`,
                specialization: doc.specialization || 'General Medicine',
                hospital: doc.hospitalName || rawData.hospital || 'Not specified',
                location: rawData.city || doc.hospitalName || rawData.hospital || 'Dhaka',
                bmdcNumber: doc.bmdcNumber || '',
                fees: { 
                    online: parseFloat(doc.feesOnline || rawData.visit_fee || 0), 
                    physical: parseFloat(doc.feesPhysical || rawData.visit_fee || 0)
                },
                rating: parseFloat(doc.rating || 0),
                isVerified: doc.isVerified || false,
                status: doc.status || 'Active',
                experience: doc.experienceYears || 0,
                degrees: Array.isArray(doc.education) ? doc.education : ['MBBS'],
                languages: ['Bangla', 'English'],
                available: doc.available !== undefined ? doc.available : true
            };
        });

        console.log('📤 Sending formatted doctors:', formattedDoctors.slice(0, 2));
        res.json(formattedDoctors);
    } catch (error) {
        console.error('❌ getDoctors Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const getDoctorById = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id, {
            include: [{ model: User, attributes: ['name', 'email', 'image'], required: false }]
        });
        
        if (doctor) {
            res.json(doctor);
        } else {
            res.status(404).json({ message: 'Doctor not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { registerDoctor, getDoctors, getDoctorById };