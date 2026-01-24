const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    getTodayQueue,
    callNextPatient,
    startAppointment,
    completeAppointment,
    getMyPosition,
    getQueueStatus
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

/**
 * @route   GET /api/queue/patient/:appointmentId
 * @desc    Get queue status for a specific appointment
 * @access  Private (Patient)
 */
router.get('/patient/:appointmentId', protect, restrictTo('PATIENT'), getQueueStatus);

/**
 * @route   POST /api/queue/stop
 * @desc    Stop/Pause the queue
 * @access  Private (Doctor)
 */
router.post('/stop', protect, restrictTo('DOCTOR'), require('../controllers/queueController').stopQueue);

/**
 * @route   POST /api/queue/start
 * @desc    Resume/Start the queue
 * @access  Private (Doctor)
 */
router.post('/start', protect, restrictTo('DOCTOR'), require('../controllers/queueController').resumeQueue);

module.exports = router;
