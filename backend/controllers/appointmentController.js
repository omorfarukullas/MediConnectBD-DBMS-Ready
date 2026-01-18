// ============================================================
// Appointment Controller - Pure Raw SQL Implementation
// Using mysql2/promise with parameterized queries
// ============================================================
const pool = require('../config/db');

// @desc    Get My Appointments
// @route   GET /api/appointments/my-appointments
// @access  Private (Patient or Doctor)
const getMyAppointments = async (req, res) => {
    console.log('📋 Fetching appointments for user:', req.user.id, 'Role:', req.user.role);
    
    try {
        // Determine which field to filter by based on user role
        const whereField = req.user.role === 'DOCTOR' ? 'doctor_id' : 'patient_id';
        
        // Raw SQL query with JOIN - using ? placeholder for security
        const query = `
            SELECT 
                a.id,
                a.patient_id,
                a.doctor_id,
                a.slot_id,
                a.appointment_type,
                a.appointment_date as date,
                a.appointment_time as time,
                a.reason_for_visit,
                a.status,
                a.queue_number,
                a.queue_status,
                a.checked_in_at,
                a.started_at,
                a.completed_at,
                a.created_at,
                a.updated_at,
                p.full_name as patient_name,
                p.email as patient_email,
                p.phone as patient_phone,
                d.full_name as doctor_name,
                d.email as doctor_email,
                d.specialization as doctor_specialization,
                d.city as doctor_city,
                d.consultation_fee,
                ds.slot_start_time,
                ds.slot_end_time,
                ds.max_appointments as slot_capacity,
                ds.current_bookings as slot_bookings
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN doctors d ON a.doctor_id = d.id
            LEFT JOIN doctor_slots ds ON a.slot_id = ds.id
            WHERE a.${whereField} = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `;
        
        const [appointments] = await pool.execute(query, [req.user.id]);
        
        console.log(`✅ Found ${appointments.length} appointments`);
        
        // Format appointments for frontend (mapping snake_case to camelCase)
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
            slotStartTime: apt.slot_start_time,
            slotEndTime: apt.slot_end_time,
            appointmentType: apt.appointment_type || 'physical',
            consultationType: apt.appointment_type === 'telemedicine' ? 'Telemedicine' : 'In-Person',
            consultationFee: apt.consultation_fee,
            reasonForVisit: apt.reason_for_visit || '',
            status: apt.status,
            queueNumber: apt.queue_number,
            queueStatus: apt.queue_status,
            checkedInAt: apt.checked_in_at,
            startedAt: apt.started_at,
            completedAt: apt.completed_at,
            slotCapacity: apt.slot_capacity,
            slotBookings: apt.slot_bookings,
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
// @route   POST /api/appointments
// @access  Private (Patient)
const bookAppointment = async (req, res) => {
    console.log('📋 Book Appointment Request Body:', req.body);
    console.log('👤 Authenticated User:', req.user);

    const { doctorId, slotId, appointmentDate, appointmentTime, appointmentType, symptoms } = req.body;

    // Validate required fields
    if (!req.user || !req.user.id) {
        console.error('❌ User not authenticated or missing user ID');
        return res.status(400).json({ message: 'User not authenticated. Please log in.' });
    }

    if (!doctorId || !slotId) {
        console.error('❌ Missing required fields:', { doctorId, slotId });
        return res.status(400).json({ 
            message: 'Missing required fields: doctorId and slotId are required' 
        });
    }

    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Step 1: Get and lock the slot to prevent double booking
        const [slots] = await connection.execute(
            `SELECT ds.*, d.full_name as doctor_name, d.specialization, d.consultation_fee
             FROM doctor_slots ds
             JOIN doctors d ON ds.doctor_id = d.id
             WHERE ds.id = ? AND ds.doctor_id = ?
             FOR UPDATE`,
            [slotId, doctorId]
        );
        
        if (slots.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                success: false,
                message: 'Slot not found' 
            });
        }

        const slot = slots[0];

        // Step 2: Validate slot availability
        if (!slot.is_active) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false,
                message: 'This slot is no longer active'
            });
        }

        if (slot.current_bookings >= slot.max_appointments) {
            await connection.rollback();
            return res.status(409).json({ 
                success: false,
                message: 'This slot is fully booked. Please select another time.'
            });
        }

        const slotDate = new Date(slot.slot_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (slotDate < today) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false,
                message: 'Cannot book appointments for past dates'
            });
        }

        // Step 3: Check if patient already has an appointment in this slot
        const [existingBooking] = await connection.execute(
            `SELECT id FROM appointments 
             WHERE patient_id = ? AND slot_id = ? AND status != 'CANCELLED'`,
            [req.user.id, slotId]
        );

        if (existingBooking.length > 0) {
            await connection.rollback();
            return res.status(409).json({ 
                success: false,
                message: 'You already have an appointment in this slot'
            });
        }
        
        // Step 4: Create appointment
        const [result] = await connection.execute(
            `INSERT INTO appointments 
             (patient_id, doctor_id, slot_id, appointment_type, appointment_date, 
              appointment_time, reason_for_visit, status, queue_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'waiting')`,
            [
                req.user.id, 
                doctorId, 
                slotId, 
                slot.appointment_type,
                slot.slot_date,
                slot.slot_start_time,
                symptoms || 'General consultation',
            ]
        );

        const appointmentId = result.insertId;

        // Step 5: Assign queue number using stored procedure
        await connection.execute(
            `CALL assign_queue_number(?, ?, ?, ?, @queue_number)`,
            [appointmentId, doctorId, req.user.id, slot.slot_date]
        );

        const [[{ '@queue_number': queueNumber }]] = await connection.execute(
            'SELECT @queue_number'
        );

        await connection.commit();
        
        console.log('✅ Appointment booked successfully:', { 
            appointmentId, 
            queueNumber,
            slotId,
            appointmentType: slot.appointment_type
        });

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully! 🎉',
            appointment: {
                id: appointmentId,
                patientId: req.user.id,
                doctorId: doctorId,
                doctorName: slot.doctor_name,
                specialization: slot.specialization,
                slotId: slotId,
                date: slot.slot_date,
                startTime: slot.slot_start_time,
                endTime: slot.slot_end_time,
                appointmentType: slot.appointment_type,
                consultationFee: slot.consultation_fee,
                status: 'PENDING',
                queueNumber: queueNumber,
                queueStatus: 'waiting'
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error creating appointment:', error);
        console.error('❌ Error stack:', error.stack);
        
        res.status(500).json({ 
            success: false,
            message: 'Failed to book appointment', 
            error: error.message 
        });
    } finally {
        connection.release();
    }
};

// @desc    Update Appointment (cancel, reschedule, complete)
// @route   PUT /api/appointments/:id
// @access  Private (Patient, Doctor, or Admin)
const updateAppointment = async (req, res) => {
    const { id } = req.params;
    const { status, date, time } = req.body;

    try {
        // Step 1: Get appointment - Raw SQL
        const [appointments] = await pool.execute(
            'SELECT id, patient_id, doctor_id, status FROM appointments WHERE id = ?',
            [id]
        );

        if (appointments.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Appointment not found' 
            });
        }

        const appointment = appointments[0];

        // Step 2: Authorization check
        if (appointment.patient_id !== req.user.id && req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to update this appointment' 
            });
        }

        // Step 3: Build dynamic update query with parameterized values
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
            return res.status(400).json({ 
                success: false,
                message: 'No fields to update' 
            });
        }

        // Add updated_at timestamp
        updates.push('updated_at = NOW()');
        values.push(id); // For WHERE clause

        // Step 4: Execute UPDATE query - Raw SQL with ? placeholders
        await pool.execute(
            `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Step 5: Fetch updated appointment
        const [updatedAppointments] = await pool.execute(
            `SELECT 
                id, patient_id, doctor_id, appointment_date, appointment_time, 
                reason_for_visit, status, created_at, updated_at
             FROM appointments WHERE id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Appointment updated successfully',
            data: {
                id: updatedAppointments[0].id,
                patientId: updatedAppointments[0].patient_id,
                doctorId: updatedAppointments[0].doctor_id,
                date: updatedAppointments[0].appointment_date,
                time: updatedAppointments[0].appointment_time,
                reasonForVisit: updatedAppointments[0].reason_for_visit,
                status: updatedAppointments[0].status,
                createdAt: updatedAppointments[0].created_at,
                updatedAt: updatedAppointments[0].updated_at
            }
        });
    } catch (error) {
        console.error('❌ Error updating appointment:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update appointment',
            error: error.message 
        });
    }
};

// @desc    Cancel Appointment (PATCH - updates status to REJECTED)
// @route   PATCH /api/appointments/:id/cancel
// @access  Private (Patient, Doctor, or Admin)
const cancelAppointment = async (req, res) => {
    const { id } = req.params;

    try {
        console.log('🚫 Cancel appointment request for ID:', id, 'by user:', req.user.id);
        
        // Step 1: Get appointment - Raw SQL
        const [appointments] = await pool.execute(
            `SELECT 
                id, patient_id, doctor_id, appointment_date, appointment_time, status 
             FROM appointments WHERE id = ?`,
            [id]
        );

        if (appointments.length === 0) {
            console.log('❌ Appointment not found');
            return res.status(404).json({ 
                success: false,
                message: 'Appointment not found' 
            });
        }

        const appointment = appointments[0];
        console.log('📋 Appointment details:', { 
            patientId: appointment.patient_id, 
            status: appointment.status 
        });

        // Step 2: Authorization check
        if (appointment.patient_id !== req.user.id && req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN') {
            console.log('❌ Not authorized. Patient ID:', appointment.patient_id, 'User ID:', req.user.id);
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to cancel this appointment' 
            });
        }

        // Step 3: Update status to REJECTED - Raw SQL with parameterized query
        await pool.execute(
            'UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?',
            ['REJECTED', id]
        );

        console.log('✅ Appointment cancelled successfully');

        res.json({ 
            success: true,
            message: 'Appointment cancelled successfully', 
            data: {
                id: id,
                status: 'REJECTED',
                date: appointment.appointment_date,
                time: appointment.appointment_time
            }
        });
    } catch (error) {
        console.error('❌ Error cancelling appointment:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to cancel appointment',
            error: error.message 
        });
    }
};

module.exports = { 
    getMyAppointments, 
    bookAppointment, 
    updateAppointment, 
    cancelAppointment 
};