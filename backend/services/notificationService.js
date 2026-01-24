/**
 * Notification Service
 * Handles real-time notification delivery via Socket.IO
 */

const pool = require('../config/db');

class NotificationService {
    constructor(io, connectedUsers) {
        this.io = io;
        this.connectedUsers = connectedUsers;
    }

    /**
     * Create and emit a notification to a specific user
     * @param {number} userId - Target user ID
     * @param {object} notificationData - Notification data
     * @returns {Promise<object>} Created notification
     */
    async createAndEmit(userId, notificationData) {
        try {
            // Create notification in database
            // Schema: id, user_id, title, message, type, is_read, related_entity_type, related_entity_id, created_at
            const [result] = await pool.execute(
                'INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    userId,
                    notificationData.title,
                    notificationData.message,
                    notificationData.type || 'GENERAL',
                    notificationData.relatedType || null,
                    notificationData.relatedId || null
                ]
            );

            const notification = {
                id: result.insertId,
                userId,
                title: notificationData.title,
                message: notificationData.message,
                type: notificationData.type || 'GENERAL',
                isRead: false,
                createdAt: new Date()
            };

            // Emit to user's room in real-time
            this.io.to(`user_${userId}`).emit('new_notification', {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                isRead: notification.isRead,
                createdAt: notification.createdAt
            });

            console.log(`📬 Notification sent to user ${userId}: ${notification.title}`);

            return notification;
        } catch (error) {
            console.error('Error creating and emitting notification:', error);
            throw error;
        }
    }

    /**
     * Emit notification marked as read
     * @param {number} userId - User ID
     * @param {number} notificationId - Notification ID
     */
    emitNotificationRead(userId, notificationId) {
        this.io.to(`user_${userId}`).emit('notification_read', {
            notificationId,
            isRead: true
        });
        console.log(`✅ Notification ${notificationId} marked as read for user ${userId}`);
    }

    /**
     * Emit all notifications marked as read
     * @param {number} userId - User ID
     */
    emitAllNotificationsRead(userId) {
        this.io.to(`user_${userId}`).emit('all_notifications_read');
        console.log(`✅ All notifications marked as read for user ${userId}`);
    }

    /**
     * Emit appointment status update
     * @param {number} userId - Patient user ID
     * @param {object} appointmentData - Appointment update data
     */
    emitAppointmentUpdate(userId, appointmentData) {
        this.io.to(`user_${userId}`).emit('appointment_updated', appointmentData);
        console.log(`📅 Appointment update sent to user ${userId}:`, appointmentData);
    }

    /**
     * Emit queue update to all patients in a doctor's queue
     * @param {number} doctorId - Doctor ID
     * @param {object} queueData - Queue update data
     */
    emitQueueUpdate(doctorId, queueData) {
        this.io.to(`queue_${doctorId}`).emit('queue_updated', queueData);
        console.log(`📊 Queue update broadcast for doctor ${doctorId}:`, queueData);
    }

    /**
     * Check if a user is currently connected
     * @param {number} userId - User ID
     * @returns {boolean} Connection status
     */
    isUserConnected(userId) {
        return this.connectedUsers.has(userId);
    }

    /**
     * Get count of connected users
     * @returns {number} Number of connected users
     */
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
}

module.exports = NotificationService;
