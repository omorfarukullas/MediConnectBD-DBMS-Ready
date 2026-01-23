const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    getTodayQueue,
    callNextPatient,
    startAppointment,
    completeAppointment,
    getMyPosition
} = require('../controllers/queueController');

/**
 * @route   GET /api/queue/doctor/:doctorId/today
 * @desc    Get today's queue for a doctor
 * @access  Private (Doctor, Admin)
 */
router.get('/doctor/:doctorId/today', protect, restrictTo('DOCTOR', 'ADMIN'), getTodayQueue);

/**
 * @route   POST /api/queue/next
 * @desc    Call next patient in queue
 * @access  Private (Doctor)
 */
router.post('/next', protect, restrictTo('DOCTOR'), callNextPatient);

/**
 * @route   PUT /api/queue/:appointmentId/start
 * @desc    Start patient appointment (mark as IN_PROGRESS)
 * @access  Private (Doctor)
 */
router.put('/:appointmentId/start', protect, restrictTo('DOCTOR'), startAppointment);

/**
 * @route   PUT /api/queue/:appointmentId/complete
 * @desc    Complete patient appointment
 * @access  Private (Doctor)
 */
router.put('/:appointmentId/complete', protect, restrictTo('DOCTOR'), completeAppointment);

/**
 * @route   GET /api/queue/my-position
 * @desc    Get patient's current queue position
 * @access  Private (Patient)
 */
router.get('/my-position', protect, restrictTo('PATIENT'), getMyPosition);

module.exports = router;
