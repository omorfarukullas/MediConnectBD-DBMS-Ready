const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AppointmentNew = sequelize.define('AppointmentNew', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'patient_id',
        references: {
            model: 'patients',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'doctor_id',
        references: {
            model: 'doctors',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    appointment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'appointment_date'
    },
    appointment_time: {
        type: DataTypes.TIME,
        allowNull: false,
        field: 'appointment_time'
    },
    reason_for_visit: {
        type: DataTypes.TEXT,
        field: 'reason_for_visit'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'appointments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { 
            unique: true, 
            fields: ['doctor_id', 'appointment_date', 'appointment_time'],
            name: 'uq_doctor_datetime'
        },
        { fields: ['patient_id'], name: 'idx_patient_id' },
        { fields: ['doctor_id'], name: 'idx_doctor_id' },
        { fields: ['appointment_date'], name: 'idx_appointment_date' },
        { fields: ['status'], name: 'idx_status' }
    ]
});

module.exports = AppointmentNew;
