import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { Appointment } from '../models/Appointment';

const router = express.Router();

// Get My Appointments
router.get('/my', protect, async (req: any, res) => {
    const appointments = await Appointment.find({ patient: req.user.id });
    res.json(appointments);
});

// Book Appointment
router.post('/', protect, async (req: any, res) => {
    const { doctorId, doctorName, date, time, type, symptoms } = req.body;
    
    // Generate simple queue number logic
    const count = await Appointment.countDocuments({ doctor: doctorId, date });
    
    const appointment = await Appointment.create({
        patient: req.user.id,
        patientName: req.user.name || 'Patient',
        doctor: doctorId,
        doctorName,
        date,
        time,
        type,
        symptoms,
        queueNumber: count + 1,
        status: 'Confirmed'
    });

    res.status(201).json(appointment);
});

export default router;