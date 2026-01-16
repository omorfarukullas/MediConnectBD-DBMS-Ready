const express = require('express');
const {
    createReview,
    getDoctorReviews,
    getMyReviews,
    updateReview,
    deleteReview
} = require('../controllers/reviewController');
const { protect, patientOnly, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/doctor/:doctorId', getDoctorReviews);

// Protected routes (requires authentication)
router.post('/', protect, patientOnly, createReview);
router.get('/my-reviews', protect, getMyReviews);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
