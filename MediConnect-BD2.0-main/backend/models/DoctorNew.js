const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

const DoctorNew = sequelize.define('DoctorNew', {
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
    city: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    specialization: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'e.g., Cardiologist, Dermatologist, Pediatrician'
    },
    hospital: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Hospital or clinic name where doctor practices'
    },
    visit_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Consultation fee in BDT'
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
    tableName: 'doctors',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['city'], name: 'idx_city' },
        { fields: ['specialization'], name: 'idx_specialization' },
        { fields: ['full_name'], name: 'idx_full_name' }
    ],
    hooks: {
        beforeCreate: async (doctor) => {
            if (doctor.password) {
                const salt = await bcrypt.genSalt(10);
                doctor.password = await bcrypt.hash(doctor.password, salt);
            }
        },
        beforeUpdate: async (doctor) => {
            if (doctor.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                doctor.password = await bcrypt.hash(doctor.password, salt);
            }
        }
    }
});

// Instance method to compare password
DoctorNew.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = DoctorNew;
