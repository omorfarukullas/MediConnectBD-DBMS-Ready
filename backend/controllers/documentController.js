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

        // Note: Schema columns are: id, patient_id, filename, filepath, document_type, description, visibility, uploaded_by_doctor_id, upload_date
        // patient_id must reference patients table, so we use req.user.profile_id (patient ID) not req.user.id (user ID)
        const patientId = req.user.profile_id || req.user.id; // profile_id for patients, fallback to id

        // Normalize path for cross-platform compatibility
        const normalizedPath = req.file.path.replace(/\\/g, '/');

        const [result] = await pool.execute(
            'INSERT INTO medical_documents (patient_id, filename, filepath, document_type, description, visibility, upload_date) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [
                patientId,
                req.file.originalname,
                normalizedPath, // Store normalized path
                documentType || 'OTHER',
                description || null,
                'PUBLIC' // Default to PUBLIC (uppercase to match ENUM)
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
                fileName: req.file.originalname,
                filePath: req.file.path,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                category: documentType || 'OTHER',
                isPrivate: false,
                uploadDate: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'Server error during file upload', error: error.message });
    }
};

/**
 * @desc    Get all documents for the logged-in user
 * @route   GET /api/documents
 * @access  Private
 */
const getDocuments = async (req, res) => {
    try {
        const patientId = req.user.profile_id || req.user.id;

        const [documents] = await pool.execute(
            `SELECT id, filename as fileName, filepath as filePath, document_type as category, 
                    description, visibility, upload_date as uploadDate,
                    IF(visibility = 'PRIVATE', true, false) as isPrivate
             FROM medical_documents 
             WHERE patient_id = ? 
             ORDER BY upload_date DESC`,
            [patientId]
        );

        // Add fileSize and fileType from filesystem if needed (not stored in DB)
        const documentsWithMetadata = documents.map(doc => ({
            ...doc,
            fileSize: 0, // Not stored in schema
            fileType: 'application/pdf' // Default, not stored in schema
        }));

        res.json(documentsWithMetadata);
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

        let query = `SELECT 
            id, 
            filename as fileName, 
            filepath as filePath, 
            document_type as category, 
            description, 
            visibility,
            upload_date as uploadDate,
            IF(visibility = 'PRIVATE', true, false) as isPrivate
            FROM medical_documents 
            WHERE patient_id = ?`;

        // Doctors can only see PUBLIC visibility documents
        if (userRole === 'DOCTOR') {
            query += ' AND visibility = "PUBLIC"';
        }

        query += ' ORDER BY upload_date DESC';

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
        const patientId = req.user.profile_id || req.user.id;

        const [documents] = await pool.execute(
            'SELECT id, patient_id, filepath FROM medical_documents WHERE id = ?',
            [req.params.id]
        );

        if (documents.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const document = documents[0];

        // Check if the user owns the document (using patient_id)
        if (document.patient_id !== patientId && req.user.role !== 'ADMIN') {
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
        const patientId = req.user.profile_id || req.user.id;

        // Verify ownership
        const [documents] = await pool.execute(
            'SELECT id, patient_id FROM medical_documents WHERE id = ?',
            [id]
        );

        if (documents.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (documents[0].patient_id !== patientId) {
            return res.status(403).json({ message: 'Not authorized to modify this document' });
        }

        // Update privacy setting using visibility column
        const visibility = isPrivate ? 'PRIVATE' : 'PUBLIC';
        await pool.execute(
            'UPDATE medical_documents SET visibility = ? WHERE id = ?',
            [visibility, id]
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
        const patientId = req.user.profile_id || req.user.id;
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
        if (userRole === 'PATIENT' && document.patient_id !== patientId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Doctors cannot access PRIVATE visibility documents
        if (userRole === 'DOCTOR' && document.visibility === 'PRIVATE') {
            return res.status(403).json({
                message: 'This document is private and cannot be accessed',
                code: 'PRIVATE_DOCUMENT'
            });
        }

        // Resolve file path correctly
        // Remove leading slash if present and join with backend directory
        let relativePath = document.filepath;
        if (relativePath.startsWith('/')) {
            relativePath = relativePath.substring(1);
        }
        const filePath = path.join(__dirname, '..', relativePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            console.error(`DB filepath: ${document.filepath}`);
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
        const patientId = req.user.profile_id || req.user.id;

        if (!['private', 'public'].includes(visibility)) {
            return res.status(400).json({ message: 'Invalid visibility value. Must be "private" or "public"' });
        }

        // Verify document belongs to user
        const [documents] = await pool.execute(
            'SELECT patient_id FROM medical_documents WHERE id = ?',
            [documentId]
        );

        if (documents.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (documents[0].patient_id !== patientId) {
            return res.status(403).json({ message: 'You can only update your own documents' });
        }

        // Update visibility (convert to uppercase for ENUM)
        const visibilityUppercase = visibility.toUpperCase();
        await pool.execute(
            'UPDATE medical_documents SET visibility = ? WHERE id = ?',
            [visibilityUppercase, documentId]
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
