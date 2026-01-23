const express = require('express');
const {
    registerUser,
    authUser,
    getUserProfile,
    updateUserProfile,
    getPrivacySettings,
    updatePrivacySettings,
    registerDoctor,
    registerHospitalAdmin
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser); // Patient registration
router.post('/register/doctor', registerDoctor); // Doctor registration
router.post('/register/hospital-admin', registerHospitalAdmin); // Hospital Admin registration
router.post('/login', authUser); // Universal login for all roles

// Protected routes (require authentication)
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

router.route('/privacy')
    .get(protect, getPrivacySettings)
    .put(protect, updatePrivacySettings);

module.exports = router;