const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getVitals, updateVitals } = require('../controllers/vitalsController');

// @route   GET /api/vitals
// @desc    Get patient vitals
// @access  Private
router.get('/', protect, getVitals);

// @route   PUT /api/vitals
// @desc    Update patient vitals
// @access  Private
router.put('/', protect, updateVitals);

module.exports = router;
