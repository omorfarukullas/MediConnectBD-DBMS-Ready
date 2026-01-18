const express = require('express');
const router = express.Router();
const {
    getDoctorSlots,
    getAvailableSlots,
    createSlots,
    updateSlot,
    deleteSlot,
    getMySlots
} = require('../controllers/slotController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/doctor/:doctorId', getDoctorSlots);
router.get('/available/:doctorId', getAvailableSlots);

// Protected routes (Doctor only)
router.post('/', protect, createSlots);
router.get('/my-slots', protect, getMySlots);
router.put('/:id', protect, updateSlot);
router.delete('/:id', protect, deleteSlot);

module.exports = router;
