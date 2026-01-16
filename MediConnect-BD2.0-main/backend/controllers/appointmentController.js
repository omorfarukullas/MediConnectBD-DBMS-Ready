const { Appointment } = require('../models');

// @desc    Get My Appointments
const getMyAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.findAll({
            where: { patientId: req.user.id },
            order: [['date', 'DESC']]
        });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Book Appointment
const bookAppointment = async (req, res) => {
    const { doctorId, doctorName, date, time, type, symptoms } = req.body;

    try {
        // Calculate next queue number
        const count = await Appointment.count({
            where: { doctorId, date }
        });

        const appointment = await Appointment.create({
            patientId: req.user.id,
            patientName: req.user.name,
            doctorId,
            doctorName,
            date,
            time,
            type,
            symptoms,
            queueNumber: count + 1,
            status: 'Confirmed'
        });

        // Send real-time notification to patient
        const notificationService = req.app.get('notificationService');
        if (notificationService) {
            await notificationService.createAndEmit(req.user.id, {
                type: 'APPOINTMENT_CONFIRMED',
                title: 'Appointment Confirmed',
                message: `Your appointment with ${doctorName} has been scheduled for ${date} at ${time}. Queue number: ${appointment.queueNumber}`,
                relatedId: appointment.id,
                relatedType: 'Appointment'
            });
        }

        res.status(201).json(appointment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Appointment (cancel, reschedule, complete)
const updateAppointment = async (req, res) => {
    const { id } = req.params;
    const { status, date, time } = req.body;

    try {
        const appointment = await Appointment.findByPk(id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if user owns this appointment
        if (appointment.userId !== req.user.id && req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update this appointment' });
        }

        // Update fields
        if (status) appointment.status = status;
        if (date) appointment.date = date;
        if (time) appointment.time = time;

        await appointment.save();

        // Send real-time notification based on status change
        const notificationService = req.app.get('notificationService');
        if (notificationService && status) {
            let notificationData = {};

            if (status === 'CANCELLED') {
                notificationData = {
                    type: 'APPOINTMENT_CANCELLED',
                    title: 'Appointment Cancelled',
                    message: `Your appointment with ${appointment.doctorName} on ${appointment.date} has been cancelled.`,
                    relatedId: appointment.id,
                    relatedType: 'Appointment'
                };
            } else if (status === 'COMPLETED') {
                notificationData = {
                    type: 'REVIEW_REQUEST',
                    title: 'How was your appointment?',
                    message: `Please rate your experience with ${appointment.doctorName}`,
                    relatedId: appointment.id,
                    relatedType: 'Appointment'
                };
            } else if (status === 'CONFIRMED') {
                notificationData = {
                    type: 'APPOINTMENT_CONFIRMED',
                    title: 'Appointment Confirmed',
                    message: `Your appointment with ${appointment.doctorName} has been confirmed for ${appointment.date} at ${appointment.time}`,
                    relatedId: appointment.id,
                    relatedType: 'Appointment'
                };
            }

            if (Object.keys(notificationData).length > 0) {
                await notificationService.createAndEmit(appointment.userId, notificationData);
            }

            // Emit appointment update to patient
            notificationService.emitAppointmentUpdate(appointment.userId, {
                id: appointment.id,
                status: appointment.status,
                date: appointment.date,
                time: appointment.time
            });
        }

        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete/Cancel Appointment
const cancelAppointment = async (req, res) => {
    const { id } = req.params;

    try {
        const appointment = await Appointment.findByPk(id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if user owns this appointment
        if (appointment.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
        }

        appointment.status = 'CANCELLED';
        await appointment.save();

        // Send real-time notification
        const notificationService = req.app.get('notificationService');
        if (notificationService) {
            await notificationService.createAndEmit(appointment.userId, {
                type: 'APPOINTMENT_CANCELLED',
                title: 'Appointment Cancelled',
                message: `Your appointment with ${appointment.doctorName} on ${appointment.date} has been cancelled.`,
                relatedId: appointment.id,
                relatedType: 'Appointment'
            });

            notificationService.emitAppointmentUpdate(appointment.userId, {
                id: appointment.id,
                status: 'CANCELLED'
            });
        }

        res.json({ message: 'Appointment cancelled successfully', appointment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMyAppointments, bookAppointment, updateAppointment, cancelAppointment };