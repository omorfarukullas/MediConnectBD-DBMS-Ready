const express = require('express');
const router = express.Router();
const { Patient } = require('../models');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/profiles';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'patient-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
        }
    }
});

// ===== GET PATIENT PROFILE =====
router.get('/profile', protect, async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        res.json({
            success: true,
            data: {
                id: patient.id,
                name: patient.full_name,
                email: patient.email,
                phone: patient.phone,
                address: patient.address,
                profileImage: patient.profile_image || null,
                bloodGroup: patient.blood_group || null,
                createdAt: patient.created_at,
                updatedAt: patient.updated_at
            }
        });
    } catch (error) {
        console.error('❌ Get patient profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ===== UPDATE PATIENT PROFILE =====
router.put('/:id', protect, async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        
        // Security: Ensure patient can only update their own profile
        if (req.user.id !== patientId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only update your own profile'
            });
        }

        const patient = await Patient.findByPk(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        const { full_name, phone, address, blood_group } = req.body;

        // Update allowed fields
        if (full_name) patient.full_name = full_name;
        if (phone) patient.phone = phone;
        if (address) patient.address = address;
        if (blood_group) patient.blood_group = blood_group;

        await patient.save();

        console.log('✅ Patient profile updated:', patient.id);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: patient.id,
                name: patient.full_name,
                email: patient.email,
                phone: patient.phone,
                address: patient.address,
                bloodGroup: patient.blood_group
            }
        });
    } catch (error) {
        console.error('❌ Update patient profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ===== CHANGE PASSWORD =====
router.put('/:id/password', protect, async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        
        // Security: Ensure patient can only change their own password
        if (req.user.id !== patientId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only change your own password'
            });
        }

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Old password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        const patient = await Patient.findByPk(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Verify old password
        const isPasswordValid = await patient.comparePassword(oldPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Old password is incorrect'
            });
        }

        // Update password (will be automatically hashed by the beforeUpdate hook)
        patient.password = newPassword;
        await patient.save();

        console.log('✅ Password changed for patient:', patient.id);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('❌ Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ===== UPLOAD PROFILE PICTURE =====
router.post('/:id/photo', protect, upload.single('photo'), async (req, res) => {
    try {
        const patientId = parseInt(req.params.id);
        
        // Security: Ensure patient can only upload their own photo
        if (req.user.id !== patientId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only upload your own profile picture'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const patient = await Patient.findByPk(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Delete old profile picture if exists
        if (patient.profile_image) {
            const oldImagePath = path.join(__dirname, '..', patient.profile_image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
                console.log('🗑️ Deleted old profile picture');
            }
        }

        // Save new profile picture path
        const profileImagePath = `/uploads/profiles/${req.file.filename}`;
        patient.profile_image = profileImagePath;
        await patient.save();

        console.log('✅ Profile picture uploaded:', profileImagePath);

        res.json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: {
                profileImage: profileImagePath
            }
        });
    } catch (error) {
        console.error('❌ Upload profile picture error:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            const filePath = req.file.path;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;
