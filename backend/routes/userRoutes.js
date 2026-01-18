const express = require('express');
const { 
    registerUser, 
    authUser, 
    getUserProfile, 
    updateUserProfile,
    getPrivacySettings,
    updatePrivacySettings
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', authUser);

// Protected routes (require authentication)
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

router.route('/privacy')
    .get(protect, getPrivacySettings)
    .put(protect, updatePrivacySettings);

module.exports = router;