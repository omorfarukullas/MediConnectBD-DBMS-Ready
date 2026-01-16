const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * DoctorSchedule Model
 * Manages doctor availability by day and time
 */
const DoctorSchedule = sequelize.define('DoctorSchedule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    dayOfWeek: {
        type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        allowNull: false,
        comment: 'Day of the week'
    },
    startTime: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Start time of availability (e.g., 09:00:00)'
    },
    endTime: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'End time of availability (e.g., 17:00:00)'
    },
    slotDuration: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        comment: 'Duration of each appointment slot in minutes'
    },
    maxPatients: {
        type: DataTypes.INTEGER,
        defaultValue: 20,
        comment: 'Maximum number of patients for this time slot'
    },
    consultationType: {
        type: DataTypes.ENUM('In-Person', 'Telemedicine', 'Both'),
        defaultValue: 'Both',
        comment: 'Type of consultation available'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this schedule is currently active'
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['doctorId'] },
        { fields: ['dayOfWeek'] },
        { fields: ['isActive'] }
    ]
});

module.exports = DoctorSchedule;
