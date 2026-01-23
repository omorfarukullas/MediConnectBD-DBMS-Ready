const express = require('express');
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected routes (requires authentication)
router.get('/', protect, getNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

// Admin only - allow both SUPER_ADMIN and HOSPITAL_ADMIN
router.post('/', protect, authorize('SUPER_ADMIN', 'HOSPITAL_ADMIN'), createNotification);

module.exports = router;
