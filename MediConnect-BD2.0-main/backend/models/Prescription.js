const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Prescription = sequelize.define('Prescription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    diagnosis: {
        type: DataTypes.STRING,
        allowNull: false
    },
    medicines: {
        type: DataTypes.JSON, // Stores: [{name: "Napa", dosage: "1+0+1"}]
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    }
});

module.exports = Prescription;