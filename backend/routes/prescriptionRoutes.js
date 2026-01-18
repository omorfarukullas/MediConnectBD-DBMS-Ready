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

// Get specific patient's prescriptions (no time restriction)
router.get('/patient/:patientId', protect, getPatientPrescriptions);

// Create new prescription (no time restriction)
router.post('/', protect, createPrescription);

// Update prescription visibility
router.patch('/:id/visibility', protect, updatePrescriptionVisibility);

module.exports = router;
