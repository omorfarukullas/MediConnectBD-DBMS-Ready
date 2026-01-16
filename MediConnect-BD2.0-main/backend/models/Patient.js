const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

const Patient = sequelize.define('Patient', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    full_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'full_name'
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { 
            isEmail: true,
            is: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Hashed password using bcrypt'
    },
    phone: {
        type: DataTypes.STRING(20)
    },
    address: {
        type: DataTypes.TEXT
    },
    blood_group: {
        type: DataTypes.STRING(5),
        allowNull: true,
        field: 'blood_group'
    },
    profile_image: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'profile_image'
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
    tableName: 'patients',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: async (patient) => {
            if (patient.password) {
                const salt = await bcrypt.genSalt(10);
                patient.password = await bcrypt.hash(patient.password, salt);
            }
        },
        beforeUpdate: async (patient) => {
            if (patient.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                patient.password = await bcrypt.hash(patient.password, salt);
            }
        }
    }
});

// Instance method to compare password
Patient.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = Patient;
