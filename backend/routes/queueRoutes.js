const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getQueueByDate,
    callNextPatient,
    getPatientQueueStatus,
    getQueueDates,
    resetQueue
} = require('../controllers/queueController');

/**
 * @route   GET /api/queue/dates
 * @desc    Get all dates with queues for doctor
 * @access  Private (Doctor)
 */
router.get('/dates', protect, getQueueDates);

/**
 * @route   GET /api/queue/:date
 * @desc    Get queue for specific date
 * @access  Private (Doctor)
 */
router.get('/:date', protect, getQueueByDate);

/**
 * @route   POST /api/queue/next
 * @desc    Call next patient in queue
 * @access  Private (Doctor)
 */
router.post('/next', protect, callNextPatient);

/**
 * @route   GET /api/queue/patient/:appointmentId
 * @desc    Get queue status for patient
 * @access  Private (Patient)
 */
router.get('/patient/:appointmentId', protect, getPatientQueueStatus);

/**
 * @route   POST /api/queue/reset
 * @desc    Reset queue for a date
 * @access  Private (Doctor)
 */
router.post('/reset', protect, resetQueue);

module.exports = router;
