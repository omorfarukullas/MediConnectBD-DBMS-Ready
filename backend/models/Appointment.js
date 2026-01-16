const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Appointment = sequelize.define('Appointment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    patientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'patient_id' // Map to database column
    },
    doctorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'doctor_id' // Map to database column
    },
    date: {
        type: DataTypes.DATEONLY, // Database has DATE type
        allowNull: false,
        field: 'appointment_date' // Map to database column
    },
    time: {
        type: DataTypes.TIME, // Database has TIME type
        allowNull: false,
        field: 'appointment_time' // Map to database column
    },
    reasonForVisit: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'reason_for_visit' // Map to database column
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'),
        defaultValue: 'PENDING',
        allowNull: false
    }
}, {
    tableName: 'appointments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Appointment;