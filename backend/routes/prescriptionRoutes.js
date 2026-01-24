/**
 * Prescription Routes
 * Time-gated access for prescription management
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { validateAppointmentAccess } = require('../middleware/appointmentAccessMiddleware');
const {
  createPrescription,
  getPrescriptions,
  getPatientPrescriptions,
  updatePrescriptionVisibility
} = require('../controllers/prescriptionController');

const router = express.Router();

// Get current user's prescriptions
router.get('/', protect, getPrescriptions);

// Get specific patient's prescriptions (time-gated for doctors)
router.get('/patient/:patientId', protect, validateAppointmentAccess, getPatientPrescriptions);

// Create new prescription (time-gated for doctors)
router.post('/', protect, validateAppointmentAccess, createPrescription);

// Update prescription visibility
router.patch('/:id/visibility', protect, updatePrescriptionVisibility);

module.exports = router;
