const express = require('express');
const router = express.Router();
const { DoctorNew } = require('../models');
const { Op } = require('sequelize');

// ===== GET ALL DOCTORS =====
router.get('/', async (req, res) => {
    console.log('🔍 [API] GET /v2/doctors - Fetching all doctors');
    try {
        const doctors = await DoctorNew.findAll({
            attributes: ['id', 'full_name', 'email', 'phone', 'city', 'specialization', 'hospital', 'visit_fee', 'created_at'],
            order: [['created_at', 'DESC']]
        });
        
        console.log(`✅ [API] Found ${doctors.length} doctors in database`);

        // Transform to match frontend DoctorResponse interface
        const transformedDoctors = doctors.map(doc => {
            const visitFee = parseFloat(doc.visit_fee) || 500;
            const onlineFee = Math.round(visitFee * 0.8); // 20% discount for online
            
            return {
                id: doc.id,
                name: doc.full_name,
                email: doc.email,
                phone: doc.phone,
                city: doc.city,
                specialization: doc.specialization,
                hospital: doc.hospital,
                bmdcNumber: doc.bmdcNumber || '',
                fees: {
                    online: onlineFee,
                    physical: visitFee
                },
                image: `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.full_name)}&background=random`,
                rating: 4.5,
                experienceYears: 5
            };
        });

        console.log('💰 [API] Sample fee data:', transformedDoctors[0]?.fees);
        res.json(transformedDoctors);
    } catch (error) {
        console.error('❌ [API] Get doctors error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

// ===== SEARCH DOCTORS (by City, Specialization, or Name) =====
router.get('/search', async (req, res) => {
    try {
        const { city, specialization, name } = req.query;
        
        const whereClause = {};
        
        if (city) {
            whereClause.city = { [Op.like]: `%${city}%` };
        }
        
        if (specialization) {
            whereClause.specialization = { [Op.like]: `%${specialization}%` };
        }
        
        if (name) {
            whereClause.full_name = { [Op.like]: `%${name}%` };
        }

        const doctors = await DoctorNew.findAll({
            where: whereClause,
            attributes: ['id', 'full_name', 'email', 'phone', 'city', 'specialization', 'hospital', 'visit_fee', 'created_at']
        });

        res.json({
            success: true,
            count: doctors.length,
            searchCriteria: { city, specialization, name },
            doctors
        });
    } catch (error) {
        console.error('Search doctors error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== GET DOCTOR BY ID =====
router.get('/:id', async (req, res) => {
    try {
        const doctor = await DoctorNew.findByPk(req.params.id, {
            attributes: ['id', 'full_name', 'email', 'phone', 'city', 'specialization', 'created_at']
        });

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        res.json({
            success: true,
            doctor
        });
    } catch (error) {
        console.error('Get doctor error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
