// ============================================================
// Super Admin Controller - Raw SQL Implementation
// For system-wide administration and hospital approval
// ============================================================
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { logAudit } = require('./auditController');

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

// @desc    Get all users across the system with profile data
// @route   GET /api/super-admin/users
// @access  Private (Super Admin only)
const getAllUsers = async (req, res) => {
    try {
        const { role, search } = req.query;

        let query = `
            SELECT 
                u.id,
                u.email,
                u.role,
                u.is_active,
                u.is_verified,
                u.created_at,
                CASE 
                    WHEN u.role = 'PATIENT' THEN p.full_name
                    WHEN u.role = 'DOCTOR' THEN d.full_name
                    WHEN u.role = 'HOSPITAL_ADMIN' THEN ha.full_name
                    WHEN u.role = 'SUPER_ADMIN' THEN sa.full_name
                END as name,
                CASE 
                    WHEN u.role = 'PATIENT' THEN p.phone
                    WHEN u.role = 'DOCTOR' THEN d.phone
                    WHEN u.role = 'HOSPITAL_ADMIN' THEN ha.phone
                    WHEN u.role = 'SUPER_ADMIN' THEN sa.phone
                END as phone
            FROM users u
            LEFT JOIN patients p ON u.role = 'PATIENT' AND p.user_id = u.id
            LEFT JOIN doctors d ON u.role = 'DOCTOR' AND d.user_id = u.id
            LEFT JOIN hospital_admins ha ON u.role = 'HOSPITAL_ADMIN' AND ha.user_id = u.id
            LEFT JOIN super_admins sa ON u.role = 'SUPER_ADMIN' AND sa.user_id = u.id
            WHERE 1=1
        `;

        const params = [];

        if (role) {
            query += ' AND u.role = ?';
            params.push(role);
        }

        if (search) {
            query += ' AND (u.email LIKE ? OR COALESCE(p.full_name, d.full_name, ha.full_name, sa.full_name) LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        query += ' ORDER BY u.created_at DESC LIMIT 100';

        const [users] = await pool.execute(query, params);

        // Debug logging
        console.log('📊 SQL Query executed:', query.substring(0, 200) + '...');
        console.log('📊 Total users found:', users.length);
        if (users.length > 0) {
            console.log('📊 First user sample:', JSON.stringify(users[0], null, 2));
        }

        res.json({ users });
    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create a new user
// @route   POST /api/super-admin/users
// @access  Private (Super Admin only)
const createUser = async (req, res) => {
    try {
        const { email, password, role, name, phone, ...additionalData } = req.body;

        // Validate input
        if (!email || !password || !role || !name) {
            return res.status(400).json({ message: 'Email, password, role, and name are required' });
        }

        // Check if user already exists
        const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into users table
        const [userResult] = await pool.execute(
            'INSERT INTO users (email, password, role, is_active, is_verified) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, role, true, true]
        );

        const userId = userResult.insertId;

        // Insert into role-specific table
        let profileId = null;
        if (role === 'PATIENT') {
            const [patientResult] = await pool.execute(
                'INSERT INTO patients (user_id, full_name, phone) VALUES (?, ?, ?)',
                [userId, name, phone || null]
            );
            profileId = patientResult.insertId;
        } else if (role === 'DOCTOR') {
            const [doctorResult] = await pool.execute(
                'INSERT INTO doctors (user_id, full_name, phone, specialization, consultation_fee) VALUES (?, ?, ?, ?, ?)',
                [userId, name, phone || null, additionalData.specialization || 'General Medicine', additionalData.consultationFee || 1000]
            );
            profileId = doctorResult.insertId;
        } else if (role === 'HOSPITAL_ADMIN') {
            const [adminResult] = await pool.execute(
                'INSERT INTO hospital_admins (user_id, full_name, phone) VALUES (?, ?, ?)',
                [userId, name, phone || null]
            );
            profileId = adminResult.insertId;
        } else if (role === 'SUPER_ADMIN') {
            const [superAdminResult] = await pool.execute(
                'INSERT INTO super_admins (user_id, full_name, phone) VALUES (?, ?, ?)',
                [userId, name, phone || null]
            );
            profileId = superAdminResult.insertId;
        }

        // Log audit
        await logAudit(
            req.user.id,
            'CREATE',
            'user',
            userId,
            `Created new ${role} user: ${email}`,
            null,
            { email, role, name },
            req
        );

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: userId,
                email,
                role,
                name,
                profileId
            }
        });
    } catch (error) {
        console.error('❌ Create User Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update a user
// @route   PUT /api/super-admin/users/:id
// @access  Private (Super Admin only)
const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { email, is_active, is_verified, name, phone } = req.body;

        // Get old values for audit
        const [oldData] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (oldData.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const oldUser = oldData[0];

        // Update users table
        const updates = [];
        const params = [];

        if (email !== undefined && email !== oldUser.email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(is_active);
        }
        if (is_verified !== undefined) {
            updates.push('is_verified = ?');
            params.push(is_verified);
        }

        if (updates.length > 0) {
            params.push(userId);
            await pool.execute(
                `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                params
            );
        }

        // Update profile table if name or phone provided
        if (name || phone) {
            const role = oldUser.role;
            let tableName;

            switch (role) {
                case 'PATIENT': tableName = 'patients'; break;
                case 'DOCTOR': tableName = 'doctors'; break;
                case 'HOSPITAL_ADMIN': tableName = 'hospital_admins'; break;
                case 'SUPER_ADMIN': tableName = 'super_admins'; break;
            }

            if (tableName) {
                const profileUpdates = [];
                const profileParams = [];

                if (name) {
                    profileUpdates.push('full_name = ?');
                    profileParams.push(name);
                }
                if (phone) {
                    profileUpdates.push('phone = ?');
                    profileParams.push(phone);
                }

                if (profileUpdates.length > 0) {
                    profileParams.push(userId);
                    await pool.execute(
                        `UPDATE ${tableName} SET ${profileUpdates.join(', ')} WHERE user_id = ?`,
                        profileParams
                    );
                }
            }
        }

        // Log audit
        await logAudit(
            req.user.id,
            'UPDATE',
            'user',
            userId,
            `Updated user: ${oldUser.email}`,
            { email: oldUser.email, is_active: oldUser.is_active },
            { email, is_active, is_verified, name, phone },
            req
        );

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('❌ Update User Error:', error);
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
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // Get user data for audit
        const [userData] = await pool.execute('SELECT email, role FROM users WHERE id = ?', [id]);
        if (userData.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userData[0];

        const [result] = await pool.execute(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Log audit
        await logAudit(
            req.user.id,
            'DELETE',
            'user',
            parseInt(id),
            `Deleted user: ${user.email} (${user.role})`,
            { email: user.email, role: user.role },
            null,
            req
        );

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
    createUser,
    updateUser,
    deleteUser,
    getAllHospitals
};
