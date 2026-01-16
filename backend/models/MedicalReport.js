const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MedicalReport = sequelize.define('MedicalReport', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    testName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    hospitalName: {
        type: DataTypes.STRING
    },
    fileUrl: {
        type: DataTypes.STRING 
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Ready'),
        defaultValue: 'Pending'
    },
    date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    }
});

module.exports = MedicalReport;