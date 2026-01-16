const { Doctor, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all doctors with filters
// @route   GET /api/doctors
const getDoctors = async (req, res) => {
    try {
        const { search, specialty, hospital } = req.query;
        
        let whereClause = { status: 'Active' };

        if (specialty && specialty !== 'All Specialties') {
            whereClause.specialization = specialty;
        }
        if (hospital && hospital !== 'All Hospitals') {
            whereClause.hospitalName = hospital;
        }
        
        // Complex search query
        if (search) {
            whereClause[Op.or] = [
                { '$User.name$': { [Op.like]: `%${search}%` } },
                { hospitalName: { [Op.like]: `%${search}%` } }
            ];
        }

        const doctors = await Doctor.findAll({
            where: whereClause,
            include: [{
                model: User,
                attributes: ['name', 'email', 'image']
            }]
        });

        // Flatten data for frontend
        const formattedDoctors = doctors.map(doc => ({
            id: doc.id,
            name: doc.User.name,
            email: doc.User.email,
            image: doc.User.image || `https://i.pravatar.cc/300?img=${doc.id}`,
            specialization: doc.specialization,
            hospital: doc.hospitalName || 'Not specified',
            location: doc.hospitalName || 'Dhaka',  // Can be extended
            bmdcNumber: doc.bmdcNumber,
            fees: { online: doc.feesOnline, physical: doc.feesPhysical },
            rating: doc.rating,
            isVerified: doc.isVerified,
            status: doc.status,
            experience: doc.experienceYears || 0,
            degrees: doc.education || ['MBBS'],  // JSON field
            languages: ['Bangla', 'English'],  // Can be added to model later
            available: doc.available
        }));

        res.json(formattedDoctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getDoctorById = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.id, {
            include: [{ model: User, attributes: ['name', 'email', 'image'] }]
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

module.exports = { getDoctors, getDoctorById };