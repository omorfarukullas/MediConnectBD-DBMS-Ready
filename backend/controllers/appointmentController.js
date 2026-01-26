// ============================================================
// Appointment Controller - Pure Raw SQL Implementation(Queue Based)
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
        const consultationType = req.query.consultationType?.toUpperCase(); // NEW: Filter parameter

        // Raw SQL query with JOIN - using ? placeholder for security
        let query = `
            SELECT 
                a.id,
                a.patient_id,
                a.doctor_id,
                a.consultation_type as appointment_type,
                a.appointment_date as date,
                a.appointment_time as time,
                a.reason_for_visit,
                a.status,
                aq.queue_number,
                aq.status as queue_status,
                a.started_at,
                a.completed_at,
                a.created_at,
                a.updated_at,
                p.full_name as patient_name,
                pu.email as patient_email,
                p.phone as patient_phone,
                d.full_name as doctor_name,
                du.email as doctor_email,
                d.specialization as doctor_specialization,
                h.city as doctor_city,
                d.consultation_fee,
                r.id as review_id,
                r.rating as review_rating,
                r.comment as review_comment
            FROM appointments a
            LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN users pu ON p.user_id = pu.id
            LEFT JOIN doctors d ON a.doctor_id = d.id
            LEFT JOIN users du ON d.user_id = du.id
            LEFT JOIN hospitals h ON d.hospital_id = h.id
            LEFT JOIN reviews r ON a.id = r.appointment_id
            WHERE a.${whereField} = ?`;

        const queryParams = [req.user.profile_id];

        // Add consultation_type filter if provided
        if (consultationType && ['PHYSICAL', 'TELEMEDICINE'].includes(consultationType)) {
            query += ' AND a.consultation_type = ?';
            queryParams.push(consultationType);
        }

        query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

        const [appointments] = await pool.execute(query, queryParams);

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
            time: apt.time, // This is Session Start Time
            appointmentType: apt.appointment_type || 'physical',
            consultationType: (apt.appointment_type || '').toUpperCase() === 'TELEMEDICINE' ? 'Telemedicine' : 'In-Person',
            consultationFee: apt.consultation_fee,
            reasonForVisit: apt.reason_for_visit || '',
            status: apt.status,
            queueNumber: apt.queue_number,
            queueStatus: apt.queue_status,
            checkedInAt: apt.checked_in_at,
            startedAt: apt.started_at,
            completedAt: apt.completed_at,
            createdAt: apt.created_at,
            updatedAt: apt.updated_at,
            review: apt.review_id ? {
                id: apt.review_id,
                rating: apt.review_rating,
                comment: apt.review_comment
            } : null
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

// @desc    Book Appointment (Queue Based)
// @route   POST /api/appointments
// @access  Private (Patient)
const bookAppointment = async (req, res) => {
    console.log('📋 Book Appointment Request Body:', req.body);
    console.log('👤 Authenticated User:', req.user);

    const { doctorId, slotId, symptoms } = req.body;

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

        // Step 0: Get Patient ID from User ID
        const [patientData] = await connection.execute(
            'SELECT id FROM patients WHERE user_id = ?',
            [req.user.id]
        );

        if (patientData.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Patient profile not found. Please complete your profile.' });
        }

        const patientId = patientData[0].id;

        // Step 1: Parse Synthetic Slot ID
        // Format: [RuleID][YYYYMMDD][HHMM]
        const slotIdStr = String(slotId);

        if (slotIdStr.length < 13) {
            throw new Error('Invalid slot ID format');
        }

        const ruleId = slotIdStr.slice(0, -12);
        const datePart = slotIdStr.slice(-12, -4); // YYYYMMDD
        const timePart = slotIdStr.slice(-4);      // HHMM

        // Format Date: YYYY-MM-DD
        const appointmentDate = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;

        // Format Time: HH:mm
        const appointmentTime = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}`;

        console.log(`🔍 Parsed Session ID: Rule=${ruleId}, Date=${appointmentDate}, StartTime=${appointmentTime}`);

        // Step 2: Verify Doctor Session Rule
        const [rules] = await connection.execute(
            `SELECT ds.*, d.full_name as doctor_name, d.specialization, d.consultation_fee
             FROM doctor_slots ds
             JOIN doctors d ON ds.doctor_id = d.id
             WHERE ds.id = ? AND ds.doctor_id = ?`,
            [ruleId, doctorId]
        );

        if (rules.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Session definition not found'
            });
        }

        const rule = rules[0];

        if (!rule.is_active) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'This session is no longer active'
            });
        }

        // Step 2.5: Validate appointmentType
        const requestedType = req.body.appointmentType?.toUpperCase() || 'PHYSICAL';

        // Validate appointmentType is a valid value
        if (!['PHYSICAL', 'TELEMEDICINE'].includes(requestedType)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid appointment type. Must be "PHYSICAL" or "TELEMEDICINE"'
            });
        }

        // Validate appointmentType matches slot capability
        if (rule.consultation_type !== 'BOTH' && rule.consultation_type !== requestedType) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `This slot only supports ${rule.consultation_type} appointments. Please select a ${rule.consultation_type === 'PHYSICAL' ? 'physical' : 'telemedicine'} slot.`,
                slotType: rule.consultation_type,
                requestedType: requestedType
            });
        }

        // Determine final consultation type
        const finalConsultationType = rule.consultation_type === 'BOTH' ? requestedType : rule.consultation_type;

        console.log(`✅ Consultation Type Validation: Slot=${rule.consultation_type}, Requested=${requestedType}, Final=${finalConsultationType}`);

        // Step 3: Check Current Capacity for this Session
        // We count appointments for this doctor + date + time (session start)
        const [counts] = await connection.execute(
            `SELECT COUNT(*) as count FROM appointments 
             WHERE doctor_id = ? 
             AND appointment_date = ? 
             AND appointment_time = ? 
             AND status != 'CANCELLED'`,
            [doctorId, appointmentDate, appointmentTime]
        );

        const currentBookings = counts[0].count;
        const maxPatients = rule.max_patients || 40;

        if (currentBookings >= maxPatients) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'This session is fully booked. Please try another day.'
            });
        }

        // Step 4: Check if patient already has an appointment in this session
        const [patientBooking] = await connection.execute(
            `SELECT id FROM appointments 
             WHERE patient_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'CANCELLED'`,
            [patientId, appointmentDate, appointmentTime]
        );

        if (patientBooking.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'You already have an appointment in this session.'
            });
        }

        // Step 5: Create appointment - AUTO CONFIRM
        const [result] = await connection.execute(
            `INSERT INTO appointments 
             (patient_id, doctor_id, consultation_type, appointment_date, 
              appointment_time, reason_for_visit, status, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', NOW(), NOW())`,
            [
                patientId,
                doctorId,
                finalConsultationType, // Use validated consultation type
                appointmentDate,
                appointmentTime,
                symptoms || 'General consultation',
            ]
        );

        const appointmentId = result.insertId;

        // Step 6: Assign queue number (MANUAL LOGIC - No Stored Procedure dependence)
        // Check max queue number for this doctor + date + time (session)
        const [queueResult] = await connection.execute(
            `SELECT MAX(queue_number) as max_queue 
             FROM appointment_queue 
             JOIN appointments ON appointment_queue.appointment_id = appointments.id
             WHERE appointments.doctor_id = ? 
             AND appointments.appointment_date = ?
             AND appointments.appointment_time = ?`,
            [doctorId, appointmentDate, appointmentTime]
        );

        let nextQueueNumber = (queueResult[0].max_queue || 0) + 1;

        // Insert into appointment_queue
        await connection.execute(
            `INSERT INTO appointment_queue (appointment_id, queue_number, patient_id, doctor_id, queue_date, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'waiting', NOW(), NOW())`,
            [appointmentId, nextQueueNumber, patientId, doctorId, appointmentDate]
        );

        // Check if any trigger/logic update on appointments table is needed (optional, keeping it simple)

        const queueNumber = nextQueueNumber;

        await connection.commit();

        console.log('✅ Appointment booked successfully:', {
            appointmentId,
            queueNumber,
            date: appointmentDate,
            time: appointmentTime
        });

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully! 🎉',
            appointment: {
                id: appointmentId,
                patientId: patientId,
                doctorId: doctorId,
                doctorName: rule.doctor_name,
                specialization: rule.specialization,
                slotId: slotId,
                date: appointmentDate,
                startTime: appointmentTime,
                endTime: rule.end_time, // Return session end time
                appointmentType: finalConsultationType, // Return actual booked type
                consultationFee: rule.consultation_fee,
                status: 'CONFIRMED',
                queueNumber: queueNumber,
                queueStatus: 'waiting'
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error creating appointment:', error);
        console.error('❌ Error Details:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            message: 'Failed to book appointment: ' + error.message,
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

// @desc    Cancel Appointment (PATCH - updates status to CANCELLED)
// @route   PATCH /api/appointments/:id/cancel
// @access  Private (Patient, Doctor, or Admin)
const cancelAppointment = async (req, res) => {
    const { id } = req.params;

    try {
        console.log('🚫 Cancel appointment request for ID:', id, 'by user:', req.user.id);

        // Step 1: Get appointment with doctor details
        const [appointments] = await pool.execute(
            `SELECT 
                a.id, a.patient_id, a.doctor_id, a.appointment_date, 
                a.appointment_time, a.status,
                d.full_name as doctor_name,
                p.full_name as patient_name
             FROM appointments a
             LEFT JOIN doctors d ON a.doctor_id = d.id
             LEFT JOIN patients p ON a.patient_id = p.id
             WHERE a.id = ?`,
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
            status: appointment.status,
            date: appointment.appointment_date
        });

        // Step 2: Authorization check
        if (appointment.patient_id !== req.user.id && req.user.role !== 'DOCTOR' && req.user.role !== 'ADMIN') {
            console.log('❌ Not authorized. Patient ID:', appointment.patient_id, 'User ID:', req.user.id);
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this appointment'
            });
        }

        // Step 3: Validate appointment is not already cancelled or completed
        if (appointment.status === 'CANCELLED' || appointment.status === 'REJECTED') {
            return res.status(400).json({
                success: false,
                message: 'This appointment has already been cancelled'
            });
        }

        if (appointment.status === 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a completed appointment'
            });
        }

        // Step 4: Validate appointment is in the future
        const appointmentDateTime = new Date(`${appointment.appointment_date} ${appointment.appointment_time}`);
        const now = new Date();

        if (appointmentDateTime < now) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a past appointment'
            });
        }

        // Step 5: Update status to CANCELLED
        await pool.execute(
            'UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?',
            ['CANCELLED', id]
        );

        console.log('✅ Appointment cancelled successfully');

        // Step 6: Notify the doctor (if notification service is available)
        try {
            const notificationService = req.app?.get('notificationService');
            if (notificationService && appointment.doctor_id) {
                await notificationService.createAndEmit(appointment.doctor_id, {
                    type: 'APPOINTMENT',
                    title: 'Appointment Cancelled',
                    message: `${appointment.patient_name || 'A patient'} has cancelled their appointment on ${appointment.appointment_date} at ${appointment.appointment_time}`,
                    relatedId: id,
                    relatedType: 'Appointment'
                });
                console.log('✅ Notification sent to doctor');
            }
        } catch (notifError) {
            console.warn('⚠️ Failed to send notification:', notifError.message);
            // Don't fail the cancellation if notification fails
        }

        res.json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: {
                id: id,
                status: 'CANCELLED',
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