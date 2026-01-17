const sequelize = require('../config/db');

// @desc    Get My Appointments
const getMyAppointments = async (req, res) => {
    console.log('📋 Fetching appointments for user:', req.user.id, 'Role:', req.user.role);
    
    try {
        // Determine which field to filter by based on user role
        const whereField = req.user.role === 'DOCTOR' ? 'doctor_id' : 'patient_id';
        
        const [appointments] = await sequelize.query(`
            SELECT 
                a.id,
                a.patient_id,
                a.doctor_id,
                a.appointment_date as date,
                a.appointment_time as time,
                a.reason_for_visit,
                a.status,
                a.created_at,
                a.updated_at,
                p.full_name as patient_name,
                p.email as patient_email,
                p.phone as patient_phone,
                d.full_name as doctor_name,
                d.email as doctor_email,
                d.specialization as doctor_specialization,
                d.city as doctor_city
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN doctors d ON a.doctor_id = d.id
            WHERE a.${whereField} = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `, { replacements: [req.user.id] });
        
        console.log(`✅ Found ${appointments.length} appointments`);
        
        // Format appointments for frontend
        const formattedAppointments = appointments.map(apt => ({
            id: apt.id,
            patientId: apt.patient_id,
            doctorId: apt.doctor_id,
            doctorName: apt.doctor_name || 'Unknown Doctor',
            doctorSpecialization: apt.doctor_specialization || 'General Medicine',
            doctorImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.doctor_name || 'Doctor')}&background=0D8ABC&color=fff`,
            patientName: apt.patient_name || 'Unknown Patient',
            date: apt.date,
            time: apt.time,
            consultationType: 'In-Person',
            reasonForVisit: apt.reason_for_visit || '',
            status: apt.status,
            queueNumber: 1,
            createdAt: apt.created_at,
            updatedAt: apt.updated_at
        }));
        
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
        const [doctors] = await sequelize.query(
            'SELECT * FROM doctors WHERE id = ?',
            { replacements: [doctorId] }
        );
        
        if (doctors.length === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const doctor = doctors[0];
        const doctorName = doctor.full_name || 'Doctor';
        
        console.log('👨‍⚕️ Doctor Info:', { 
            id: doctor.id, 
            fullName: doctor.full_name, 
            selectedName: doctorName 
        });
        
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
        
        // Check if the time slot is already booked
        const [existingAppointments] = await sequelize.query(
            `SELECT * FROM appointments 
             WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? 
             AND status IN ('PENDING', 'ACCEPTED')`,
            { replacements: [doctorId, appointmentDate, convertedTime] }
        );
        
        if (existingAppointments.length > 0) {
            console.log('❌ Time slot already booked');
            return res.status(409).json({ 
                success: false,
                message: 'This time slot is already booked. Please select a different time.',
                error: 'Time slot unavailable'
            });
        }
        
        // Create appointment
        const [result] = await sequelize.query(
            `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit, status) 
             VALUES (?, ?, ?, ?, ?, 'PENDING')`,
            { replacements: [req.user.id, doctorId, appointmentDate, convertedTime, symptoms || 'General checkup'] }
        );

        const appointmentId = result;
        console.log('✅ Appointment created successfully:', appointmentId);

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            data: {
                id: appointmentId,
                patientId: req.user.id,
                doctorId: doctorId,
                doctorName: doctorName,
                date: appointmentDate,
                time: convertedTime,
                consultationType: 'In-Person',
                status: 'PENDING',
                queueNumber: 1
            }
        });
    } catch (error) {
        console.error('❌ Error creating appointment:', error);
        console.error('❌ Error stack:', error.stack);
        
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
        const [appointments] = await sequelize.query(
            'SELECT * FROM appointments WHERE id = ?',
            { replacements: [id] }
        );

        if (appointments.length === 0) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const appointment = appointments[0];

        // Authorization check
        if (appointment.patient_id !== req.user.id && req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update this appointment' });
        }

        // Build update query
        const updates = [];
        const values = [];

        if (status) {
            updates.push('status = ?');
            values.push(status);
        }
        if (date) {
            updates.push('appointment_date = ?');
            values.push(date);
        }
        if (time) {
            updates.push('appointment_time = ?');
            values.push(time);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(id);

        await sequelize.query(
            `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
            { replacements: values }
        );

        // Fetch updated appointment
        const [updatedAppointments] = await sequelize.query(
            'SELECT * FROM appointments WHERE id = ?',
            { replacements: [id] }
        );

        res.json({
            success: true,
            data: updatedAppointments[0]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel Appointment (PATCH - updates status, doesn't delete)
const cancelAppointment = async (req, res) => {
    const { id } = req.params;

    try {
        console.log('🚫 Cancel appointment request for ID:', id, 'by user:', req.user.id);
        
        const [appointments] = await sequelize.query(
            'SELECT * FROM appointments WHERE id = ?',
            { replacements: [id] }
        );

        if (appointments.length === 0) {
            console.log('❌ Appointment not found');
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const appointment = appointments[0];
        console.log('📋 Appointment details:', { patientId: appointment.patient_id, status: appointment.status });

        // Check if user owns this appointment
        if (appointment.patient_id !== req.user.id && req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN') {
            console.log('❌ Not authorized. Patient ID:', appointment.patient_id, 'User ID:', req.user.id);
            return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
        }

        // Update status to REJECTED
        await sequelize.query(
            'UPDATE appointments SET status = ? WHERE id = ?',
            { replacements: ['REJECTED', id] }
        );

        console.log('✅ Appointment cancelled successfully');

        res.json({ 
            success: true,
            message: 'Appointment cancelled successfully', 
            appointment: {
                id: id,
                status: 'REJECTED',
                date: appointment.appointment_date,
                time: appointment.appointment_time
            }
        });
    } catch (error) {
        console.error('❌ Error cancelling appointment:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMyAppointments, bookAppointment, updateAppointment, cancelAppointment };