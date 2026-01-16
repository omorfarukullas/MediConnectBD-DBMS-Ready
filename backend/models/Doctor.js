const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Doctor = sequelize.define('Doctor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'userId',  // Explicitly use camelCase column name
        references: {
            model: 'Users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    // Legacy fields for backward compatibility
    full_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true  // Legacy field - password is stored in Users table now
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    hospital: {
        type: DataTypes.STRING,
        allowNull: true
    },
    visit_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    specialization: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bmdcNumber: {
        type: DataTypes.STRING,
        allowNull: true,  // Temporarily allow null to fix sync issues
        unique: false     // Temporarily disable unique constraint
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
}, {
    tableName: 'Doctors',
    timestamps: false  // Disable automatic timestamps
});

module.exports = Doctor;