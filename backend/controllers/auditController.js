// ============================================================
// Audit Controller - System Audit Logging
// ============================================================
const pool = require('../config/db');

/**
 * Helper function to log an audit action
 * Call this from other controllers to track important actions
 */
const logAudit = async (userId, actionType, entityType, entityId, description, oldValue = null, newValue = null, req = null) => {
    try {
        const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
        const userAgent = req?.get('user-agent') || null;

        await pool.execute(
            `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, description, old_value, new_value, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                actionType,
                entityType,
                entityId,
                description,
                oldValue ? JSON.stringify(oldValue) : null,
                newValue ? JSON.stringify(newValue) : null,
                ipAddress,
                userAgent
            ]
        );
    } catch (error) {
        // Don't throw - audit logging should not break the main flow
        console.error('⚠️ Audit logging failed:', error.message);
    }
};

/**
 * @desc    Get audit logs with filtering
 * @route   GET /api/audit/logs
 * @access  Private (Super Admin only)
 */
const getAuditLogs = async (req, res) => {
    try {
        const {
            action_type,
            entity_type,
            user_id,
            start_date,
            end_date,
            limit = 50,
            offset = 0
        } = req.query;

        let query = `
            SELECT 
                a.id,
                a.user_id,
                a.action_type,
                a.entity_type,
                a.entity_id,
                a.description,
                a.old_value,
                a.new_value,
                a.ip_address,
                a.user_agent,
                a.created_at,
                u.email as user_email,
                u.role as user_role
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE 1=1
        `;

        const params = [];

        if (action_type) {
            query += ' AND a.action_type = ?';
            params.push(action_type);
        }

        if (entity_type) {
            query += ' AND a.entity_type = ?';
            params.push(entity_type);
        }

        if (user_id) {
            query += ' AND a.user_id = ?';
            params.push(parseInt(user_id));
        }

        if (start_date) {
            query += ' AND a.created_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND a.created_at <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await pool.execute(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
        const countParams = [];

        if (action_type) {
            countQuery += ' AND action_type = ?';
            countParams.push(action_type);
        }
        if (entity_type) {
            countQuery += ' AND entity_type = ?';
            countParams.push(entity_type);
        }
        if (user_id) {
            countQuery += ' AND user_id = ?';
            countParams.push(parseInt(user_id));
        }
        if (start_date) {
            countQuery += ' AND created_at >= ?';
            countParams.push(start_date);
        }
        if (end_date) {
            countQuery += ' AND created_at <= ?';
            countParams.push(end_date);
        }

        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            logs: logs.map(log => ({
                ...log,
                old_value: log.old_value ? JSON.parse(log.old_value) : null,
                new_value: log.new_value ? JSON.parse(log.new_value) : null
            })),
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });
    } catch (error) {
        console.error('❌ Get Audit Logs Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get system statistics for Super Admin dashboard
 * @route   GET /api/audit/stats
 * @access  Private (Super Admin only)
 */
const getSystemStats = async (req, res) => {
    try {
        // Total users by role
        const [userStats] = await pool.execute(`
            SELECT role, COUNT(*) as count, SUM(is_active) as active_count
            FROM users
            GROUP BY role
        `);

        // Today's activity
        const [todayActivity] = await pool.execute(`
            SELECT action_type, COUNT(*) as count
            FROM audit_logs
            WHERE DATE(created_at) = CURDATE()
            GROUP BY action_type
        `);

        // Recent logins (last 24h)
        const [recentLogins] = await pool.execute(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM audit_logs
            WHERE action_type = 'LOGIN' 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        // Total appointments by status
        const [appointmentStats] = await pool.execute(`
            SELECT status, COUNT(*) as count
            FROM appointments
            GROUP BY status
        `);

        // Database size and table counts
        const [tableStats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM patients) as total_patients,
                (SELECT COUNT(*) FROM doctors) as total_doctors,
                (SELECT COUNT(*) FROM appointments) as total_appointments,
                (SELECT COUNT(*) FROM audit_logs) as total_audit_logs
        `);

        res.json({
            users: userStats,
            todayActivity,
            recentLogins: recentLogins[0].count,
            appointments: appointmentStats,
            database: tableStats[0]
        });
    } catch (error) {
        console.error('❌ Get System Stats Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    logAudit,
    getAuditLogs,
    getSystemStats
};
