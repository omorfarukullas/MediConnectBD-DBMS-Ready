const express = require('express');
const router = express.Router();
const { getPublicHospitalResources, getPublicHospitals } = require('../controllers/hospitalController');

// Public routes - no authentication required

/**
 * @route   GET /api/hospitals
 * @desc    Get list of all hospitals
 * @access  Public
 */
router.get('/', getPublicHospitals);

/**
 * @route   GET /api/hospitals/:hospitalId/resources
 * @desc    Get hospital resources (beds, tests, departments)
 * @access  Public
 */
router.get('/:hospitalId/resources', getPublicHospitalResources);

module.exports = router;
