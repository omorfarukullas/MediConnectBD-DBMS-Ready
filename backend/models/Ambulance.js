const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Ambulance = sequelize.define('Ambulance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    driverName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    plateNumber: {
        type: DataTypes.STRING,
        unique: true
    },
    type: {
        type: DataTypes.ENUM('ICU', 'AC', 'Non-AC', 'Freezer'),
        defaultValue: 'Non-AC'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Busy', 'On the Way'),
        defaultValue: 'Active'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false
    },
    rating: {
        type: DataTypes.FLOAT,
        defaultValue: 5.0
    }
});

module.exports = Ambulance;