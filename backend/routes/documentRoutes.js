const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const { validateAppointmentAccess, validateDocumentAccess } = require('../middleware/appointmentAccessMiddleware');
const {
    uploadDocument,
    getDocuments,
    getPatientDocuments,
    deleteDocument,
    updateDocumentPrivacy,
    updateDocumentVisibility,
    downloadDocument
} = require('../controllers/documentController');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Create unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, DOCX, and image files (JPEG, JPG, PNG) are allowed'));
    }
};

// Initialize multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

// Routes

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a medical document
 * @access  Private
 */
router.post('/upload', protect, (req, res) => {
    upload.single('document')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer-specific errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            // Custom errors (e.g., file type validation)
            return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file selected' });
        }

        // Call controller
        uploadDocument(req, res);
    });
});

/**
 * @route   GET /api/documents
 * @desc    Get all documents for logged-in user
 * @access  Private
 */
router.get('/', protect, getDocuments);

/**
 * @route   GET /api/documents/patient/:userId
 * @desc    Get documents for a specific patient (Doctor/Admin only)
 * @access  Private (Doctor/Admin) - Privacy filtered
 */
router.get('/patient/:userId', protect, getPatientDocuments);

/**
 * @route   PATCH /api/documents/:id/privacy
 * @desc    Update document privacy setting
 * @access  Private (Patient only)
 */
router.patch('/:id/privacy', protect, updateDocumentPrivacy);

/**
 * @route   PATCH /api/documents/:id/visibility
 * @desc    Update document visibility/audience (private/public)
 * @access  Private (Patient only)
 */
router.patch('/:id/visibility', protect, updateDocumentVisibility);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download a document
 * @access  Private - Privacy filtered and time-gated for doctors
 */
router.get('/:id/download', protect, validateDocumentAccess, downloadDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document
 * @access  Private
 */
router.delete('/:id', protect, deleteDocument);

module.exports = router;
