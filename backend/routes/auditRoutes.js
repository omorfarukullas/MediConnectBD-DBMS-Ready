const express = require('express');
const { getAuditLogs, getSystemStats } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require Super Admin authentication
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// Get audit logs with filtering
router.get('/logs', getAuditLogs);

// Get system statistics
router.get('/stats', getSystemStats);

module.exports = router;
