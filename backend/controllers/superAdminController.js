// ============================================================
// Super Admin Controller - Raw SQL Implementation
// For system-wide administration and hospital approval
// ============================================================
const pool = require('../config/db');

// @desc    Get all hospitals pending approval
// @route   GET /api/super-admin/hospitals/pending
// @access  Private (Super Admin only)
const getPendingHospitals = async (req, res) => {
    try {
        const [hospitals] = await pool.execute(
            `SELECT * FROM hospitals WHERE is_approved = FALSE ORDER BY created_at DESC`
        );

        res.json(hospitals);
    } catch (error) {
        console.error('❌ Error fetching pending hospitals:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Approve a hospital
// @route   PUT /api/super-admin/hospitals/:id/approve
// @access  Private (Super Admin only)
const approveHospital = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            `UPDATE hospitals SET is_approved = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        res.json({ message: 'Hospital approved successfully' });
    } catch (error) {
        console.error('❌ Error approving hospital:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Reject/Deactivate a hospital
// @route   PUT /api/super-admin/hospitals/:id/reject
// @access  Private (Super Admin only)
const rejectHospital = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            `UPDATE hospitals SET is_approved = FALSE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        res.json({ message: 'Hospital rejected/deactivated successfully' });
    } catch (error) {
        console.error('❌ Error rejecting hospital:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get system-wide statistics
// @route   GET /api/super-admin/stats
// @access  Private (Super Admin only)
const getSystemStats = async (req, res) => {
    try {
        // Get counts for all major entities
        const [[{ totalUsers }]] = await pool.execute('SELECT COUNT(*) as totalUsers FROM users');
        const [[{ totalPatients }]] = await pool.execute('SELECT COUNT(*) as totalPatients FROM patients');
        const [[{ totalDoctors }]] = await pool.execute('SELECT COUNT(*) as totalDoctors FROM doctors');
        const [[{ totalHospitals }]] = await pool.execute('SELECT COUNT(*) as totalHospitals FROM hospitals');
        const [[{ approvedHospitals }]] = await pool.execute('SELECT COUNT(*) as approvedHospitals FROM hospitals WHERE is_approved = TRUE');
        const [[{ pendingHospitals }]] = await pool.execute('SELECT COUNT(*) as pendingHospitals FROM hospitals WHERE is_approved = FALSE');
        const [[{ totalAppointments }]] = await pool.execute('SELECT COUNT(*) as totalAppointments FROM appointments');
        const [[{ completedAppointments }]] = await pool.execute('SELECT COUNT(*) as completedAppointments FROM appointments WHERE status = "COMPLETED"');

        res.json({
            totalUsers,
            totalPatients,
            totalDoctors,
            totalHospitals,
            approvedHospitals,
            pendingHospitals,
            totalAppointments,
            completedAppointments
        });
    } catch (error) {
        console.error('❌ Error fetching system stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all users across the system
// @route   GET /api/super-admin/users
// @access  Private (Super Admin only)
const getAllUsers = async (req, res) => {
    try {
        const { role } = req.query;

        let query = 'SELECT id, email, role, created_at FROM users';
        const params = [];

        if (role) {
            query += ' WHERE role = ?';
            params.push(role);
        }

        query += ' ORDER BY created_at DESC';

        const [users] = await pool.execute(query, params);

        res.json(users);
    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete/Deactivate a user
// @route   DELETE /api/super-admin/users/:id
// @access  Private (Super Admin only)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const [result] = await pool.execute(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all hospitals (approved and pending)
// @route   GET /api/super-admin/hospitals
// @access  Private (Super Admin only)
const getAllHospitals = async (req, res) => {
    try {
        const [hospitals] = await pool.execute(
            'SELECT * FROM hospitals ORDER BY created_at DESC'
        );

        res.json(hospitals);
    } catch (error) {
        console.error('❌ Error fetching hospitals:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getPendingHospitals,
    approveHospital,
    rejectHospital,
    getSystemStats,
    getAllUsers,
    deleteUser,
    getAllHospitals
};
