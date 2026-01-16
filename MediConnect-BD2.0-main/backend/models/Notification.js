const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Notification Model
 * Stores user notifications for appointments, reminders, etc.
 */
const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Notification title/subject'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Notification content/body'
    },
    type: {
        type: DataTypes.ENUM(
            'APPOINTMENT_REMINDER',
            'APPOINTMENT_CONFIRMED',
            'APPOINTMENT_CANCELLED',
            'PRESCRIPTION_READY',
            'REVIEW_REQUEST',
            'GENERAL'
        ),
        defaultValue: 'GENERAL',
        comment: 'Type of notification'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the user has read this notification'
    },
    relatedId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of related entity (e.g., appointment ID, prescription ID)'
    },
    relatedType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Type of related entity (e.g., "Appointment", "Prescription")'
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
        defaultValue: 'MEDIUM',
        comment: 'Notification priority level'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When this notification should expire'
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['isRead'] },
        { fields: ['type'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = Notification;
