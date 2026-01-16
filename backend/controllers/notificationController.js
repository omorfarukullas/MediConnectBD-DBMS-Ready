const { Notification } = require('../models');

/**
 * @desc    Get all notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
    try {
        const { unreadOnly } = req.query;

        const whereClause = { userId: req.user.id };
        if (unreadOnly === 'true') {
            whereClause.isRead = false;
        }

        const notifications = await Notification.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: 50 // Last 50 notifications
        });

        const unreadCount = await Notification.count({
            where: {
                userId: req.user.id,
                isRead: false
            }
        });

        res.json({
            count: notifications.length,
            unreadCount,
            notifications
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
        const notification = await Notification.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.isRead = true;
        await notification.save();

        res.json({
            message: 'Notification marked as read',
            notification
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
        await Notification.update(
            { isRead: true },
            {
                where: {
                    userId: req.user.id,
                    isRead: false
                }
            }
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
        const notification = await Notification.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await notification.destroy();

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

        const notification = await Notification.create({
            userId,
            title,
            message,
            type: type || 'GENERAL',
            priority: priority || 'MEDIUM',
            relatedId,
            relatedType
        });

        res.status(201).json({
            message: 'Notification created successfully',
            notification
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
        return await Notification.create({
            userId,
            title,
            message,
            type,
            relatedId,
            relatedType,
            priority
        });
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
