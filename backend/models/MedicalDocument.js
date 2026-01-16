const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * MedicalDocument Model
 * Stores metadata for uploaded medical documents (reports, prescriptions, lab results)
 */
const MedicalDocument = sequelize.define('MedicalDocument', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Original filename of the uploaded document'
    },
    filepath: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Server path where the file is stored'
    },
    mimetype: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'MIME type of the file (e.g., application/pdf, image/jpeg)'
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'File size in bytes'
    },
    documentType: {
        type: DataTypes.ENUM(
            'PRESCRIPTION',
            'LAB_REPORT',
            'MEDICAL_REPORT',
            'XRAY',
            'SCAN',
            'OTHER'
        ),
        defaultValue: 'OTHER',
        comment: 'Category of the medical document'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional description or notes about the document'
    }
}, {
    tableName: 'MedicalDocuments',
    timestamps: true
});

module.exports = MedicalDocument;
