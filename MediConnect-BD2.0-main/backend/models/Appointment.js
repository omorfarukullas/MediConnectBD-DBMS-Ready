const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Appointment = sequelize.define('Appointment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    date: {
        type: DataTypes.STRING, // Storing as YYYY-MM-DD
        allowNull: false
    },
    time: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('In-Person', 'Telemedicine'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled', 'Missed'),
        defaultValue: 'Pending'
    },
    queueNumber: {
        type: DataTypes.INTEGER
    },
    symptoms: {
        type: DataTypes.TEXT
    },
    patientName: {
        type: DataTypes.STRING // Snapshot
    },
    doctorName: {
        type: DataTypes.STRING // Snapshot
    }
});

module.exports = Appointment;