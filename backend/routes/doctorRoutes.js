const express = require('express');
const { registerDoctor, getDoctors, getDoctorById } = require('../controllers/doctorController');

const router = express.Router();

// Doctor Registration (Public)
router.post('/register', registerDoctor);

// Get Doctors (Public)
router.get('/', getDoctors);
router.get('/:id', getDoctorById);

module.exports = router;