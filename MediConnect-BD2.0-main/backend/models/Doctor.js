const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Doctor = sequelize.define('Doctor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    specialization: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bmdcNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    experienceYears: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    hospitalName: {
        type: DataTypes.STRING // Denormalized or can rely on relation
    },
    feesOnline: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0
    },
    feesPhysical: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0
    },
    education: {
        type: DataTypes.JSON, // Stores array of objects
        defaultValue: []
    },
    available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    rating: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'On Leave'),
        defaultValue: 'Active'
    }
});

module.exports = Doctor;