const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Hospital = sequelize.define('Hospital', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('Public', 'Private', 'Diagnostic'),
        defaultValue: 'Private'
    },
    icuAvailable: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    generalBedsAvailable: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    contact: {
        type: DataTypes.STRING
    }
});

module.exports = Hospital;