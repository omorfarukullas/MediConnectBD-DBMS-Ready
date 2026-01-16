const { Appointment } = require('../models');

// @desc    Get My Appointments
const getMyAppointments = async (req, res) => {
    console.log('📋 Fetching appointments for user:', req.user.id);
    
    try {
        const { Doctor, User } = require('../models');
        
        const appointments = await Appointment.findAll({
            where: { patientId: req.user.id },
            include: [{
                model: Doctor,
                as: 'doctor',
                attributes: ['id', 'specialization', 'bmdcNumber', 'experienceYears'],
                include: [{
                    model: User,
                    attributes: ['name', 'email', 'phone', 'image'],
                    required: false
                }],
                required: false // LEFT JOIN to handle cases where doctor might be deleted
            }],
            order: [['date', 'DESC'], ['time', 'DESC']]
        });
        
        console.log(`✅ Found ${appointments.length} appointments`);
        
        // Format appointments for frontend
        const formattedAppointments = appointments.map(apt => {
            const doctorData = apt.doctor || {};
            const userData = doctorData.User || {};
            const rawDoctor = doctorData.dataValues || {};
            
            return {
                id: apt.id,
                patientId: apt.patientId,
                doctorId: apt.doctorId,
                doctorName: userData.name || rawDoctor.full_name || 'Doctor',
                doctorSpecialization: doctorData.specialization || 'General Medicine',
                doctorImage: userData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'Doctor')}&background=0D8ABC&color=fff`,
                date: apt.date,
                time: apt.time,
                consultationType: 'In-Person', // Default value since column doesn't exist in DB
                reasonForVisit: apt.reasonForVisit || '',
                status: apt.status,
                queueNumber: 1, // Default value since column doesn't exist in DB
                createdAt: apt.createdAt,
                updatedAt: apt.updatedAt
            };
        });
        
        res.json({
            success: true,
            data: formattedAppointments
        });
    } catch (error) {
        console.error('❌ Error fetching appointments:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message 
        });
    }
};

// @desc    Book Appointment
const bookAppointment = async (req, res) => {
    // Log incoming request for debugging
    console.log('📋 Book Appointment Request Body:', req.body);
    console.log('👤 Authenticated User:', req.user);

    const { doctorId, appointmentDate, appointmentTime, consultationType, symptoms } = req.body;

    // Validate required fields
    if (!req.user || !req.user.id) {
        console.error('❌ User not authenticated or missing user ID');
        return res.status(400).json({ message: 'User not authenticated. Please log in.' });
    }

    if (!doctorId || !appointmentDate || !appointmentTime) {
        console.error('❌ Missing required fields:', { doctorId, appointmentDate, appointmentTime });
        return res.status(400).json({ 
            message: 'Missing required fields: doctorId, appointmentDate, and appointmentTime are required' 
        });
    }

    try {
        // Get doctor details for the appointment
        const { Doctor, User } = require('../models');
        const doctor = await Doctor.findByPk(doctorId, {
            include: [{
                model: User,
                attributes: ['name'],
                required: false
            }]
        });
        
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Get doctor name from User or legacy full_name
        const doctorName = doctor.User?.name || doctor.dataValues?.full_name || 'Doctor';
        
        // Convert time from "10:00 AM" to "10:00:00" (24-hour format)
        let convertedTime = appointmentTime;
        if (appointmentTime.includes('AM') || appointmentTime.includes('PM')) {
            const [time, period] = appointmentTime.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours);
            
            if (period === 'PM' && hours !== 12) {
                hours += 12;
            } else if (period === 'AM' && hours === 12) {
                hours = 0;
            }
            
            convertedTime = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
        }
        
        console.log('🕐 Time conversion:', appointmentTime, '->', convertedTime);
        
        // Create appointment with proper field mapping
        const appointment = await Appointment.create({
            patientId: req.user.id,
            doctorId: doctorId,
            date: appointmentDate,
            time: convertedTime,
            reasonForVisit: symptoms || 'General checkup',
            status: 'PENDING'
        });

        console.log('✅ Appointment created successfully:', appointment.id);

        // Fetch the created appointment with doctor details for response
        const createdAppointment = await Appointment.findByPk(appointment.id, {
            include: [{
                model: Doctor,
                as: 'doctor',
                attributes: ['id', 'specialization'],
                include: [{
                    model: User,
                    attributes: ['name'],
                    required: false
                }],
                required: false
            }]
        });

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            data: {
                id: appointment.id,
                patientId: appointment.patientId,
                doctorId: appointment.doctorId,
                doctorName: doctorName,
                date: appointment.date,
                time: appointment.time,
                consultationType: 'In-Person', // Default value
                status: appointment.status,
                queueNumber: 1 // Default value
            }
        });
    } catch (error) {
        console.error('❌ Error creating appointment:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error name:', error.name);
        if (error.parent) {
            console.error('❌ SQL Error:', error.parent.sqlMessage);
            console.error('❌ SQL:', error.parent.sql);
        }
        res.status(500).json({ 
            success: false,
            message: 'Failed to book appointment', 
            error: error.message 
        });
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

// @desc    Cancel Appointment (PATCH - updates status, doesn't delete)
const cancelAppointment = async (req, res) => {
    const { id } = req.params;

    try {
        console.log('🚫 Cancel appointment request for ID:', id, 'by user:', req.user.id);
        
        const appointment = await Appointment.findByPk(id);

        if (!appointment) {
            console.log('❌ Appointment not found');
            return res.status(404).json({ message: 'Appointment not found' });
        }

        console.log('📋 Appointment details:', { patientId: appointment.patientId, status: appointment.status });

        // Check if user owns this appointment (use patientId instead of userId)
        if (appointment.patientId !== req.user.id && req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN') {
            console.log('❌ Not authorized. Patient ID:', appointment.patientId, 'User ID:', req.user.id);
            return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
        }

        // Update status to REJECTED (which exists in DB schema)
        appointment.status = 'REJECTED';
        await appointment.save();

        console.log('✅ Appointment cancelled successfully');

        // Send real-time notification
        const notificationService = req.app.get('notificationService');
        if (notificationService) {
            await notificationService.createAndEmit(appointment.patientId, {
                type: 'APPOINTMENT_CANCELLED',
                title: 'Appointment Cancelled',
                message: `Your appointment on ${appointment.date} has been cancelled.`,
                relatedId: appointment.id,
                relatedType: 'Appointment'
            });

            notificationService.emitAppointmentUpdate(appointment.patientId, {
                id: appointment.id,
                status: 'REJECTED'
            });
        }

        res.json({ 
            success: true,
            message: 'Appointment cancelled successfully', 
            appointment: {
                id: appointment.id,
                status: appointment.status,
                date: appointment.date,
                time: appointment.time
            }
        });
    } catch (error) {
        console.error('❌ Error cancelling appointment:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMyAppointments, bookAppointment, updateAppointment, cancelAppointment };