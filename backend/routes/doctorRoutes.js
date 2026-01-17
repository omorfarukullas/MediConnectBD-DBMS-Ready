const express = require('express');
const { registerDoctor, authDoctor, getDoctors, getDoctorById } = require('../controllers/doctorController');

const router = express.Router();

// Doctor Registration (Public)
router.post('/register', registerDoctor);

// Doctor Login (Public)
router.post('/login', authDoctor);

// Get Doctors (Public)
router.get('/', getDoctors);
router.get('/:id', getDoctorById);

module.exports = router;