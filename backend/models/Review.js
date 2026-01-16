const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Review Model
 * Stores patient reviews and ratings for doctors
 */
const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        },
        comment: 'Rating from 1 to 5 stars'
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Patient feedback about the doctor'
    },
    appointmentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Reference to the appointment being reviewed'
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the review is from a verified appointment'
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['doctorId'] },
        { fields: ['patientId'] },
        { fields: ['rating'] }
    ]
});

module.exports = Review;
