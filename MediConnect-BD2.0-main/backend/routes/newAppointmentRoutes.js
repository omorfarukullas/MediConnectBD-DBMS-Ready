const express = require('express');
const router = express.Router();
const { AppointmentNew, Patient, DoctorNew } = require('../models');
const { Op } = require('sequelize');
const { protect } = require('../middleware/authMiddleware');

// ===== CREATE APPOINTMENT =====
router.post('/', protect, async (req, res) => {
    try {
        // Extract patient_id from authenticated user (prevent impersonation)
        const patient_id = req.user.id;
        const { doctor_id, appointment_date, appointment_time, reason_for_visit } = req.body;

        // Check if patient exists
        const patient = await Patient.findByPk(patient_id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Check if doctor exists
        const doctor = await DoctorNew.findByPk(doctor_id);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Check for double booking
        const existingAppointment = await AppointmentNew.findOne({
            where: {
                doctor_id,
                appointment_date,
                appointment_time
            }
        });

        if (existingAppointment) {
            return res.status(400).json({ 
                message: 'This time slot is already booked. Please choose another time.' 
            });
        }

        // Create appointment
        const appointment = await AppointmentNew.create({
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            reason_for_visit,
            status: 'PENDING'
        });

        // Fetch complete appointment with patient and doctor details
        const completeAppointment = await AppointmentNew.findByPk(appointment.id, {
            include: [
                { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'email', 'phone'] },
                { model: DoctorNew, as: 'doctor', attributes: ['id', 'full_name', 'specialization', 'city'] }
            ]
        });

        res.status(201).json({
            message: 'Appointment created successfully',
            appointment: completeAppointment
        });
    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== GET ALL APPOINTMENTS =====
router.get('/', async (req, res) => {
    try {
        const appointments = await AppointmentNew.findAll({
            include: [
                { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'email', 'phone'] },
                { model: DoctorNew, as: 'doctor', attributes: ['id', 'full_name', 'specialization', 'city'] }
            ],
            order: [['appointment_date', 'DESC'], ['appointment_time', 'DESC']]
        });

        res.json({
            success: true,
            count: appointments.length,
            appointments
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== GET MY APPOINTMENTS (AUTHENTICATED USER) =====
router.get('/my', protect, async (req, res) => {
    try {
        console.log('📋 Fetching appointments for user:', req.user.id, 'Role:', req.user.role);
        
        let whereClause = {};
        if (req.user.role === 'PATIENT') {
            whereClause.patient_id = req.user.id;
        } else if (req.user.role === 'DOCTOR') {
            whereClause.doctor_id = req.user.id;
        }

        const appointments = await AppointmentNew.findAll({
            where: whereClause,
            include: [
                { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'email', 'phone'] },
                { model: DoctorNew, as: 'doctor', attributes: ['id', 'full_name', 'specialization', 'city', 'hospital'] }
            ],
            order: [['appointment_date', 'DESC'], ['appointment_time', 'DESC']]
        });

        console.log(`✅ Found ${appointments.length} appointments`);

        res.json({
            success: true,
            data: appointments.map(apt => ({
                id: apt.id,
                patientId: apt.patient_id,
                doctorId: apt.doctor_id,
                doctorName: apt.doctor?.full_name || 'Unknown Doctor',
                doctorSpecialization: apt.doctor?.specialization || 'General Medicine',
                doctorImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.doctor?.full_name || 'Doctor')}&background=0D8ABC&color=fff`,
                patientName: apt.patient?.full_name || 'Unknown Patient',
                date: apt.appointment_date,
                time: apt.appointment_time,
                consultationType: 'In-Person',
                reasonForVisit: apt.reason_for_visit || '',
                status: apt.status,
                queueNumber: 1,
                createdAt: apt.created_at,
                updatedAt: apt.updated_at
            }))
        });
    } catch (error) {
        console.error('❌ Error fetching my appointments:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message 
        });
    }
});

// ===== GET APPOINTMENTS BY PATIENT =====
router.get('/patient/:patientId', async (req, res) => {
    try {
        const appointments = await AppointmentNew.findAll({
            where: { patient_id: req.params.patientId },
            include: [
                { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'email'] },
                { model: DoctorNew, as: 'doctor', attributes: ['id', 'full_name', 'specialization', 'city'] }
            ],
            order: [['appointment_date', 'DESC'], ['appointment_time', 'DESC']]
        });

        res.json({
            success: true,
            count: appointments.length,
            appointments
        });
    } catch (error) {
        console.error('Get patient appointments error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== GET APPOINTMENTS BY DOCTOR =====
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const appointments = await AppointmentNew.findAll({
            where: { doctor_id: req.params.doctorId },
            include: [
                { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'email', 'phone'] },
                { model: DoctorNew, as: 'doctor', attributes: ['id', 'full_name', 'specialization'] }
            ],
            order: [['appointment_date', 'DESC'], ['appointment_time', 'DESC']]
        });

        res.json({
            success: true,
            count: appointments.length,
            appointments
        });
    } catch (error) {
        console.error('Get doctor appointments error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== UPDATE APPOINTMENT STATUS =====
router.patch('/:id/status', protect, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status value. Allowed: PENDING, CONFIRMED, CANCELLED, COMPLETED' 
            });
        }

        const appointment = await AppointmentNew.findByPk(req.params.id);
        if (!appointment) {
            return res.status(404).json({ 
                success: false,
                message: 'Appointment not found' 
            });
        }

        // Authorization: Only patient or doctor can update
        if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only update your own appointments'
            });
        }

        appointment.status = status;
        await appointment.save();

        const updatedAppointment = await AppointmentNew.findByPk(appointment.id, {
            include: [
                { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'email'] },
                { model: DoctorNew, as: 'doctor', attributes: ['id', 'full_name', 'specialization'] }
            ]
        });

        console.log(`✅ Appointment ${appointment.id} status updated to ${status}`);

        res.json({
            success: true,
            message: 'Appointment status updated successfully',
            appointment: updatedAppointment
        });
    } catch (error) {
        console.error('Update appointment status error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

// ===== DELETE APPOINTMENT (Admin Only - Use PATCH for cancellation) =====
router.delete('/:id', protect, async (req, res) => {
    try {
        const appointment = await AppointmentNew.findByPk(req.params.id);
        if (!appointment) {
            return res.status(404).json({ 
                success: false,
                message: 'Appointment not found' 
            });
        }

        // Security: Only allow deletion for the patient who created it or admin
        if (req.user.role !== 'admin' && appointment.patient_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only delete your own appointments'
            });
        }

        // Safely delete the appointment (foreign keys are set to CASCADE)
        await appointment.destroy();

        console.log(`🗑️ Appointment ${req.params.id} deleted by user ${req.user.id}`);

        res.json({
            success: true,
            message: 'Appointment deleted successfully'
        });
    } catch (error) {
        console.error('Delete appointment error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

module.exports = router;
