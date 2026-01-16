const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Vitals = sequelize.define('Vitals', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    bloodGroup: { type: DataTypes.STRING },
    height: { type: DataTypes.STRING },
    weight: { type: DataTypes.STRING },
    bloodPressure: { type: DataTypes.STRING },
    heartRate: { type: DataTypes.STRING },
    allergies: { type: DataTypes.JSON }, 
    conditions: { type: DataTypes.JSON } 
});

module.exports = Vitals;