const pool = require('../config/db');

/**
 * @desc    Get all notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
    try {
        const { unreadOnly } = req.query;

        let query = 'SELECT * FROM notifications WHERE user_id = ?';
        const params = [req.user.id];

        if (unreadOnly === 'true') {
            query += ' AND is_read = 0';
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const [notifications] = await pool.execute(query, params);

        // Get unread count
        const [unreadResult] = await pool.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );

        const formattedNotifications = notifications.map(n => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type,
            priority: n.priority,
            isRead: n.is_read === 1,
            relatedId: n.related_id,
            relatedType: n.related_type,
            createdAt: n.created_at,
            updatedAt: n.updated_at
        }));

        res.json({
            count: formattedNotifications.length,
            unreadCount: unreadResult[0].count,
            notifications: formattedNotifications
        });
    } catch (error) {
        console.error('Get Notifications Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
    try {
        const [notifications] = await pool.execute(
            'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (notifications.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await pool.execute(
            'UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE id = ?',
            [req.params.id]
        );

        const notification = notifications[0];
        res.json({
            message: 'Notification marked as read',
            notification: {
                id: notification.id,
                userId: notification.user_id,
                title: notification.title,
                message: notification.message,
                isRead: true
            }
        });
    } catch (error) {
        console.error('Mark as Read Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
    try {
        await pool.execute(
            'UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark All as Read Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
    try {
        const [notifications] = await pool.execute(
            'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (notifications.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await pool.execute('DELETE FROM notifications WHERE id = ?', [req.params.id]);

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Delete Notification Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Create a notification (Admin/System only)
 * @route   POST /api/notifications
 * @access  Private (Admin)
 */
const createNotification = async (req, res) => {
    const { userId, title, message, type, priority, relatedId, relatedType } = req.body;

    try {
        if (!userId || !title || !message) {
            return res.status(400).json({ message: 'userId, title, and message are required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO notifications (user_id, title, message, type, priority, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, title, message, type || 'GENERAL', priority || 'MEDIUM', relatedId || null, relatedType || null]
        );

        res.status(201).json({
            message: 'Notification created successfully',
            notification: {
                id: result.insertId,
                userId,
                title,
                message,
                type: type || 'GENERAL',
                priority: priority || 'MEDIUM',
                relatedId,
                relatedType
            }
        });
    } catch (error) {
        console.error('Create Notification Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Helper function to create notification (can be used by other controllers)
 */
const createNotificationHelper = async (userId, title, message, type, relatedId, relatedType, priority = 'MEDIUM') => {
    try {
        const [result] = await pool.execute(
            'INSERT INTO notifications (user_id, title, message, type, priority, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, title, message, type, priority, relatedId || null, relatedType || null]
        );
        return { id: result.insertId, userId, title, message, type, priority, relatedId, relatedType };
    } catch (error) {
        console.error('Helper Create Notification Error:', error);
        return null;
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    createNotificationHelper
};
