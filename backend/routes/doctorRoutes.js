const express = require('express');
const { authDoctor, getDoctors, getDoctorById, getDoctorEarnings } = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// NOTE: Doctor registration has been moved to /api/auth/register/doctor
// This route uses the new schema with proper users + doctors table structure

// Doctor Login (Public)
router.post('/login', authDoctor);

// Get Doctor Earnings (Private) - MUST come before /:id route
router.get('/earnings', protect, getDoctorEarnings);

// Get Doctors (Public)
router.get('/', getDoctors);
router.get('/:id', getDoctorById);

module.exports = router;