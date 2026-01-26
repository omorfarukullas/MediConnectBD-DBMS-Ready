const express = require('express');
const {
    getPendingHospitals,
    approveHospital,
    rejectHospital,
    getSystemStats,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getAllHospitals
} = require('../controllers/superAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and SUPER_ADMIN role
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// Hospital management
router.get('/hospitals', getAllHospitals);
router.get('/hospitals/pending', getPendingHospitals);
router.put('/hospitals/:id/approve', approveHospital);
router.put('/hospitals/:id/reject', rejectHospital);

// User management (CRUD)
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// System statistics
router.get('/stats', getSystemStats);

module.exports = router;
