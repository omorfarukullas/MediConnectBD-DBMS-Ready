const pool = require('../config/db');
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

        const [result] = await pool.execute(
            'INSERT INTO medical_documents (filename, filepath, mimetype, size, document_type, description, user_id, visibility) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                req.file.originalname,
                req.file.path,
                req.file.mimetype,
                req.file.size,
                documentType || 'OTHER',
                description || null,
                req.user.id,
                'public' // Default to public
            ]
        );

        // Send real-time notification
        const notificationService = req.app.get('notificationService');
        if (notificationService) {
            await notificationService.createAndEmit(req.user.id, {
                type: 'GENERAL',
                title: 'Document Uploaded',
                message: `Your document "${req.file.originalname}" has been uploaded successfully.`,
                relatedId: result.insertId,
                relatedType: 'MedicalDocument'
            });
        }

        res.status(201).json({
            message: 'File uploaded successfully',
            document: {
                id: result.insertId,
                filename: req.file.originalname,
                filepath: req.file.path,
                mimetype: req.file.mimetype,
                size: req.file.size,
                documentType: documentType || 'OTHER',
                description: description || null,
                createdAt: new Date()
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
        const [documents] = await pool.execute(
            'SELECT id, filename, filepath, mimetype, size, document_type as documentType, description, visibility, created_at as createdAt FROM medical_documents WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );

        res.json(documents);
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ message: 'Server error while fetching documents' });
    }
};

/**
 * @desc    Get documents for a specific patient (for doctors/admins)
 * @route   GET /api/documents/patient/:userId
 * @access  Private (Doctor/Admin) - Time-gated for doctors
 */
const getPatientDocuments = async (req, res) => {
    try {
        const { userId } = req.params;
        const userRole = req.user.role;

        // Only doctors and admins can access other users' documents
        if (userRole !== 'DOCTOR' && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to view patient documents' });
        }

        // For doctors, check patient's privacy settings first
        if (userRole === 'DOCTOR') {
            const [patientSettings] = await pool.execute(
                'SELECT share_medical_history FROM patients WHERE id = ?',
                [userId]
            );
            
            if (patientSettings.length === 0) {
                return res.status(404).json({ message: 'Patient not found' });
            }
            
            // If patient has disabled sharing medical history, return empty array
            if (!patientSettings[0].share_medical_history) {
                console.log(`🔒 Patient ${userId} has disabled medical history sharing`);
                return res.json([]);
            }
        }

        let query = `SELECT 
            id, 
            filename, 
            filepath, 
            mimetype, 
            size, 
            document_type as documentType, 
            description, 
            visibility,
            created_at as createdAt 
            FROM medical_documents 
            WHERE user_id = ?`;
        
        // Doctors can only see public visibility documents
        if (userRole === 'DOCTOR') {
            query += ' AND (visibility = "public" OR visibility IS NULL)';
        }
        
        query += ' ORDER BY created_at DESC';

        const [documents] = await pool.execute(query, [userId]);

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
        const [documents] = await pool.execute(
            'SELECT id, user_id, filepath FROM medical_documents WHERE id = ?',
            [req.params.id]
        );

        if (documents.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const document = documents[0];

        // Check if the user owns the document
        if (document.user_id !== req.user.id && req.user.role !== 'ADMIN') {
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

        await pool.execute('DELETE FROM medical_documents WHERE id = ?', [req.params.id]);

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ message: 'Server error while deleting document' });
    }
};

/**
 * @desc    Update document privacy setting
 * @route   PATCH /api/documents/:id/privacy
 * @access  Private (Patient only)
 */
const updateDocumentPrivacy = async (req, res) => {
    try {
        const { id } = req.params;
        const { isPrivate } = req.body;
        const userId = req.user.id;

        // Verify ownership
        const [documents] = await pool.execute(
            'SELECT id, user_id FROM medical_documents WHERE id = ?',
            [id]
        );

        if (documents.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (documents[0].user_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to modify this document' });
        }

        // Update privacy setting
        await pool.execute(
            'UPDATE medical_documents SET is_private = ? WHERE id = ?',
            [isPrivate ? 1 : 0, id]
        );

        res.json({ 
            message: 'Privacy setting updated successfully',
            isPrivate: isPrivate 
        });
    } catch (error) {
        console.error('Update privacy error:', error);
        res.status(500).json({ message: 'Server error while updating privacy' });
    }
};

/**
 * @desc    Download a document
 * @route   GET /api/documents/:id/download
 * @access  Private - Privacy filtered for doctors
 */
const downloadDocument = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const documentId = req.params.id;

        // Get document info
        const [documents] = await pool.execute(
            'SELECT * FROM medical_documents WHERE id = ?',
            [documentId]
        );

        if (documents.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const document = documents[0];

        // Patients can access their own documents
        if (userRole === 'PATIENT' && document.user_id !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Doctors cannot access private documents or private visibility
        if (userRole === 'DOCTOR' && (document.is_private || document.visibility === 'private')) {
            return res.status(403).json({
                message: 'This document is private and cannot be accessed',
                code: 'PRIVATE_DOCUMENT'
            });
        }

        const filePath = path.resolve(document.filepath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Send file
        res.download(filePath, document.filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error downloading file' });
                }
            }
        });
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({ message: 'Server error while downloading document' });
    }
};

/**
 * @desc    Update document visibility (audience)
 * @route   PATCH /api/documents/:id/visibility
 * @access  Private (Patient only)
 */
const updateDocumentVisibility = async (req, res) => {
    try {
        const { visibility } = req.body;
        const documentId = req.params.id;
        const userId = req.user.id;

        if (!['private', 'public'].includes(visibility)) {
            return res.status(400).json({ message: 'Invalid visibility value. Must be "private" or "public"' });
        }

        // Verify document belongs to user
        const [documents] = await pool.execute(
            'SELECT user_id FROM medical_documents WHERE id = ?',
            [documentId]
        );

        if (documents.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (documents[0].user_id !== userId) {
            return res.status(403).json({ message: 'You can only update your own documents' });
        }

        // Update visibility
        await pool.execute(
            'UPDATE medical_documents SET visibility = ? WHERE id = ?',
            [visibility, documentId]
        );

        res.json({ 
            message: 'Visibility updated successfully',
            visibility: visibility 
        });
    } catch (error) {
        console.error('Update visibility error:', error);
        res.status(500).json({ message: 'Server error while updating visibility' });
    }
};

module.exports = {
    uploadDocument,
    getDocuments,
    getPatientDocuments,
    deleteDocument,
    updateDocumentPrivacy,
    updateDocumentVisibility,
    downloadDocument
};
