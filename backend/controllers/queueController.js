/**
 * Queue Controller
 * Handles live queue tracking and management
 * Updated to work with current appointments table schema
 */

const pool = require('../config/db');

/**
 * @desc    Get today's queue for a doctor
 * @route   GET /api/queue/doctor/:doctorId/today
 * @access  Private (Doctor)
 */
const getTodayQueue = async (req, res) => {
    const { doctorId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Verify the requesting user is the doctor or admin
        if (req.user.profile_id !== parseInt(doctorId) && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this queue'
            });
        }

        const [appointments] = await pool.execute(
            `SELECT 
                a.id,
                a.patient_id,
                a.appointment_date,
                a.appointment_time,
                aq.queue_number,
                a.consultation_type,
                a.status,
                a.reason_for_visit,
                a.started_at,
                a.completed_at,
                a.completed_at,
                p.full_name as patient_name,
                p.phone
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
            WHERE a.doctor_id = ? 
            AND a.appointment_date = ?
            AND a.status != 'CANCELLED'
            ORDER BY aq.queue_number ASC`,
            [doctorId, today]
        );

        // Calculate queue statistics
        const stats = {
            total: appointments.length,
            waiting: appointments.filter(a => a.status === 'PENDING').length,
            inProgress: appointments.filter(a => a.status === 'IN_PROGRESS').length,
            completed: appointments.filter(a => a.status === 'COMPLETED').length
        };

        // Find current patient
        const currentPatient = appointments.find(a => a.status === 'IN_PROGRESS');

        res.json({
            success: true,
            data: {
                appointments: appointments.map(a => ({
                    id: a.id,
                    patientId: a.patient_id,
                    patientName: a.patient_name,
                    phone: a.phone,
                    queueNumber: a.queue_number,
                    appointmentTime: a.appointment_time,
                    consultationType: a.consultation_type,
                    status: a.status,
                    reasonForVisit: a.reason_for_visit,
                    startedAt: a.started_at,
                    completedAt: a.completed_at
                })),
                stats,
                currentPatient: currentPatient ? {
                    id: currentPatient.id,
                    queueNumber: currentPatient.queue_number,
                    patientName: currentPatient.patient_name
                } : null,
                date: today
            }
        });
    } catch (error) {
        console.error('❌ Error fetching queue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch queue',
            error: error.message
        });
    }
};

/**
 * @desc    Call next patient in queue
 * @route   POST /api/queue/next
 * @access  Private (Doctor)
 */
const callNextPatient = async (req, res) => {
    const doctorId = req.user.profile_id;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Find next PENDING patient in queue
        const [nextPatients] = await pool.execute(
            `SELECT 
                a.*,
                aq.queue_number,
                p.full_name as patient_name
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
            WHERE a.doctor_id = ?
            AND a.appointment_date = ?
            AND a.status = 'PENDING'
            AND aq.queue_number IS NOT NULL
            ORDER BY aq.queue_number ASC
            LIMIT 1`,
            [doctorId, today]
        );

        if (nextPatients.length === 0) {
            return res.json({
                success: true,
                message: 'No patients waiting in queue',
                data: null
            });
        }

        const nextPatient = nextPatients[0];

        // Emit WebSocket event if io is available
        const io = req.app.get('io');
        if (io) {
            io.to(`doctor-${doctorId}`).emit('queue:next', {
                appointmentId: nextPatient.id,
                queueNumber: nextPatient.queue_number,
                patientName: nextPatient.patient_name
            });

            io.to(`patient-${nextPatient.patient_id}`).emit('queue:called', {
                appointmentId: nextPatient.id,
                queueNumber: nextPatient.queue_number,
                message: 'You have been called! Please proceed to the doctor.'
            });
        }

        res.json({
            success: true,
            message: 'Next patient called',
            data: {
                appointmentId: nextPatient.id,
                queueNumber: nextPatient.queue_number,
                patientName: nextPatient.patient_name,
                patientId: nextPatient.patient_id
            }
        });
    } catch (error) {
        console.error('❌ Error calling next patient:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to call next patient',
            error: error.message
        });
    }
};

/**
 * @desc    Start patient appointment (mark as IN_PROGRESS)
 * @route   PUT /api/queue/:appointmentId/start
 * @access  Private (Doctor)
 */
const startAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const doctorId = req.user.profile_id;

    try {
        // Verify appointment belongs to this doctor
        const [appointments] = await pool.execute(
            'SELECT * FROM appointments WHERE id = ? AND doctor_id = ?',
            [appointmentId, doctorId]
        );

        if (appointments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or not authorized'
            });
        }

        const appointment = appointments[0];

        if (appointment.status === 'IN_PROGRESS') {
            return res.status(400).json({
                success: false,
                message: 'Appointment already in progress'
            });
        }

        if (appointment.status === 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: 'Appointment already completed'
            });
        }

        // Update appointment status
        await pool.execute(
            `UPDATE appointments 
             SET status = 'IN_PROGRESS', 
                 started_at = NOW(),
                 updated_at = NOW()
             WHERE id = ?`,
            [appointmentId]
        );

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.to(`doctor-${doctorId}`).emit('queue:update', {
                appointmentId,
                status: 'IN_PROGRESS'
            });

            io.to(`patient-${appointment.patient_id}`).emit('appointment:started', {
                appointmentId,
                message: 'Your appointment has started'
            });
        }

        res.json({
            success: true,
            message: 'Appointment started',
            data: {
                appointmentId,
                status: 'IN_PROGRESS',
                startedAt: new Date()
            }
        });
    } catch (error) {
        console.error('❌ Error starting appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start appointment',
            error: error.message
        });
    }
};

/**
 * @desc    Complete patient appointment
 * @route   PUT /api/queue/:appointmentId/complete
 * @access  Private (Doctor)
 */
const completeAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const doctorId = req.user.profile_id;

    try {
        // Verify appointment belongs to this doctor
        const [appointments] = await pool.execute(
            'SELECT * FROM appointments WHERE id = ? AND doctor_id = ?',
            [appointmentId, doctorId]
        );

        if (appointments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or not authorized'
            });
        }

        const appointment = appointments[0];

        if (appointment.status === 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: 'Appointment already completed'
            });
        }

        // Update appointment status
        await pool.execute(
            `UPDATE appointments 
             SET status = 'COMPLETED', 
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE id = ?`,
            [appointmentId]
        );

        // Emit WebSocket event
        const io = req.app.get('io');
        if (io) {
            io.to(`doctor-${doctorId}`).emit('queue:update', {
                appointmentId,
                status: 'COMPLETED'
            });

            io.to(`patient-${appointment.patient_id}`).emit('appointment:completed', {
                appointmentId,
                message: 'Your appointment has been completed'
            });
        }

        res.json({
            success: true,
            message: 'Appointment completed',
            data: {
                appointmentId,
                status: 'COMPLETED',
                completedAt: new Date()
            }
        });
    } catch (error) {
        console.error('❌ Error completing appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete appointment',
            error: error.message
        });
    }
};

/**
 * @desc    Get patient's current queue position
 * @route   GET /api/queue/my-position
 * @access  Private (Patient)
 */
const getMyPosition = async (req, res) => {
    const patientId = req.user.profile_id;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Get patient's appointment for today
        const [myAppointments] = await pool.execute(
            `SELECT 
                a.*,
                d.full_name as doctor_name,
                d.specialization
            FROM appointments a
            LEFT JOIN doctors d ON a.doctor_id = d.id
            WHERE a.patient_id = ?
            AND a.appointment_date = ?
            AND a.status IN ('PENDING', 'IN_PROGRESS')
            ORDER BY a.appointment_time ASC
            LIMIT 1`,
            [patientId, today]
        );

        if (myAppointments.length === 0) {
            return res.json({
                success: true,
                message: 'No active appointments for today',
                data: null
            });
        }

        const myAppointment = myAppointments[0];

        // Count how many patients are ahead in the queue
        const [ahead] = await pool.execute(
            `SELECT COUNT(*) as count
            FROM appointments a
            JOIN appointment_queue aq ON a.id = aq.appointment_id
            WHERE a.doctor_id = ?
            AND a.appointment_date = ?
            AND aq.queue_number < ?
            AND a.status = 'PENDING'`,
            [myAppointment.doctor_id, today, myAppointment.queue_number]
        );

        const patientsAhead = ahead[0].count;

        res.json({
            success: true,
            data: {
                appointmentId: myAppointment.id,
                queueNumber: myAppointment.queue_number,
                status: myAppointment.status,
                appointmentTime: myAppointment.appointment_time,
                doctorName: myAppointment.doctor_name,
                specialization: myAppointment.specialization,
                patientsAhead,
                estimatedWaitMinutes: patientsAhead * 15, // Rough estimate: 15 min per patient
                isYourTurn: myAppointment.status === 'IN_PROGRESS'
            }
        });
    } catch (error) {
        console.error('❌ Error getting queue position:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get queue position',
            error: error.message
        });
    }
};

/**
 * @desc    Get status for a specific appointment
 * @route   GET /api/queue/patient/:appointmentId
 * @access  Private (Patient)
 */
const getQueueStatus = async (req, res) => {
    const { appointmentId } = req.params;
    const patientId = req.user.profile_id;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Verify appointment and join details
        // Get Appointment Queue Details
        const [rows] = await pool.execute(
            `SELECT 
                a.*,
                d.full_name as doctor_name,
                d.specialization,
                aq.queue_number
            FROM appointments a
            LEFT JOIN doctors d ON a.doctor_id = d.id
            LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
            WHERE a.id = ? AND a.patient_id = ?`,
            [appointmentId, patientId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        const appointment = rows[0];

        // Calculate patients ahead
        let patients_before = 0;
        if (appointment.status === 'PENDING' && appointment.queue_number) {
            const [ahead] = await pool.execute(
                `SELECT COUNT(*) as count
                FROM appointments a
                JOIN appointment_queue aq ON a.id = aq.appointment_id
                WHERE a.doctor_id = ?
                AND a.appointment_date = ?
                AND aq.queue_number < ?
                AND a.status = 'PENDING'`,
                [appointment.doctor_id, today, appointment.queue_number]
            );
            patients_before = ahead[0].count;
        }

        // Response format matching QueueStatusModal expectation
        const responseData = {
            id: appointment.id,
            date: appointment.appointment_date,
            time: appointment.appointment_time,
            queue_number: appointment.queue_number || 0,
            queue_status: (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') ? 'waiting' : appointment.status.toLowerCase(),
            estimated_time: new Date(new Date().getTime() + patients_before * 15 * 60000).toISOString(), // rough est
            called_at: appointment.started_at,
            doctor_name: appointment.doctor_name,
            specialization: appointment.specialization,
            room_number: '101', // Mock room as column doesn't exist
            patients_before
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('❌ Error in getQueueStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch queue status',
            error: error.message
        });
    }
};

module.exports = {
    getTodayQueue,
    callNextPatient,
    startAppointment,
    completeAppointment,
    getMyPosition,
    getQueueStatus
};
