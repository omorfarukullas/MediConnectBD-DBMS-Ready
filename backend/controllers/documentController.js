const { MedicalDocument } = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Upload a medical document
 * @route   POST /api/documents/upload
 * @access  Private
 */
const uploadDocument = async (req, res) => {
    try {
        const { documentType, description } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const document = await MedicalDocument.create({
            filename: req.file.originalname,
            filepath: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            documentType: documentType || 'OTHER',
            description: description || null,
            userId: req.user.id
        });

        // Send real-time notification
        const notificationService = req.app.get('notificationService');
        if (notificationService) {
            await notificationService.createAndEmit(req.user.id, {
                type: 'GENERAL',
                title: 'Document Uploaded',
                message: `Your document "${req.file.originalname}" has been uploaded successfully.`,
                relatedId: document.id,
                relatedType: 'MedicalDocument'
            });
        }

        res.status(201).json({
            message: 'File uploaded successfully',
            document: {
                id: document.id,
                filename: document.filename,
                filepath: document.filepath,
                mimetype: document.mimetype,
                size: document.size,
                documentType: document.documentType,
                description: document.description,
                createdAt: document.createdAt
            }
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'Server error during file upload' });
    }
};

/**
 * @desc    Get all documents for the logged-in user
 * @route   GET /api/documents
 * @access  Private
 */
const getDocuments = async (req, res) => {
    try {
        const documents = await MedicalDocument.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'filename', 'filepath', 'mimetype', 'size', 'documentType', 'description', 'createdAt']
        });

        res.json(documents);
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ message: 'Server error while fetching documents' });
    }
};

/**
 * @desc    Get documents for a specific patient (for doctors/admins)
 * @route   GET /api/documents/patient/:userId
 * @access  Private (Doctor/Admin)
 */
const getPatientDocuments = async (req, res) => {
    try {
        const { userId } = req.params;

        // Only doctors and admins can access other users' documents
        if (req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to view patient documents' });
        }

        const documents = await MedicalDocument.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'filename', 'filepath', 'mimetype', 'size', 'documentType', 'description', 'createdAt']
        });

        res.json(documents);
    } catch (error) {
        console.error('Get patient documents error:', error);
        res.status(500).json({ message: 'Server error while fetching patient documents' });
    }
};

/**
 * @desc    Delete a document
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
const deleteDocument = async (req, res) => {
    try {
        const document = await MedicalDocument.findByPk(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check if the user owns the document
        if (document.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to delete this document' });
        }

        // Delete the actual file from the server
        const filepath = path.resolve(document.filepath);
        fs.unlink(filepath, (err) => {
            if (err) {
                console.error('Failed to delete file from disk:', err);
            } else {
                console.log(`✅ File deleted: ${filepath}`);
            }
        });

        await document.destroy();

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ message: 'Server error while deleting document' });
    }
};

module.exports = {
    uploadDocument,
    getDocuments,
    getPatientDocuments,
    deleteDocument
};
