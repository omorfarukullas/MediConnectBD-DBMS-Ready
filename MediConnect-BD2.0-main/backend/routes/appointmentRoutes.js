const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getMyAppointments, bookAppointment, updateAppointment, cancelAppointment } = require('../controllers/appointmentController');

const router = express.Router();

router.get('/my', protect, getMyAppointments);
router.post('/', protect, bookAppointment);
router.put('/:id', protect, updateAppointment);
router.delete('/:id', protect, cancelAppointment);

module.exports = router;