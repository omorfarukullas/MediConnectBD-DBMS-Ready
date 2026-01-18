const pool = require('../config/db');

/**
 * @desc    Get queue for a specific date (Doctor only)
 * @route   GET /api/queue/:date
 * @access  Private (Doctor)
 */
const getQueueByDate = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { date } = req.params;

        // Get all appointments for this doctor on this date, ordered by queue number
        const [appointments] = await pool.execute(`
            SELECT 
                a.id,
                a.appointment_date as date,
                a.appointment_time as time,
                a.queue_number,
                a.queue_status,
                a.estimated_time,
                a.called_at,
                a.reason_for_visit as reason,
                p.id as patient_id,
                p.full_name as patient_name,
                p.email as patient_email,
                p.phone as patient_phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = ? 
            AND a.appointment_date = ?
            AND a.status IN ('PENDING', 'ACCEPTED')
            ORDER BY a.queue_number ASC, a.appointment_time ASC
        `, [doctorId, date]);

        // If no queue numbers assigned yet, assign them
        if (appointments.length > 0 && !appointments[0].queue_number) {
            await assignQueueNumbers(doctorId, date);
            // Fetch again with queue numbers
            const [updatedAppointments] = await pool.execute(`
                SELECT 
                    a.id,
                    a.appointment_date as date,
                    a.appointment_time as time,
                    a.queue_number,
                    a.queue_status,
                    a.estimated_time,
                    a.called_at,
                    a.reason_for_visit as reason,
                    p.id as patient_id,
                    p.full_name as patient_name,
                    p.email as patient_email,
                    p.phone as patient_phone
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                WHERE a.doctor_id = ? 
                AND a.appointment_date = ?
                AND a.status IN ('PENDING', 'ACCEPTED')
                ORDER BY a.queue_number ASC
            `, [doctorId, date]);
            
            return res.json(updatedAppointments);
        }

        res.json(appointments);
    } catch (error) {
        console.error('Get queue error:', error);
        res.status(500).json({ message: 'Server error while fetching queue' });
    }
};

/**
 * Helper function to assign queue numbers
 */
const assignQueueNumbers = async (doctorId, date) => {
    const [appointments] = await pool.execute(`
        SELECT id, appointment_time FROM appointments 
        WHERE doctor_id = ? AND appointment_date = ? 
        AND status IN ('PENDING', 'ACCEPTED')
        AND queue_number IS NULL
        ORDER BY appointment_time ASC
    `, [doctorId, date]);

    for (let i = 0; i < appointments.length; i++) {
        const avgConsultTime = 15; // 15 minutes per patient
        const estimatedTime = new Date(`${date}T${appointments[0]?.appointment_time || '09:00'}`);
        estimatedTime.setMinutes(estimatedTime.getMinutes() + (i * avgConsultTime));

        await pool.execute(`
            UPDATE appointments 
            SET queue_number = ?, 
                estimated_time = ?,
                queue_status = 'waiting'
            WHERE id = ?
        `, [i + 1, estimatedTime, appointments[i].id]);
    }
};

/**
 * @desc    Call next patient in queue
 * @route   POST /api/queue/next
 * @access  Private (Doctor)
 */
const callNextPatient = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { date, currentAppointmentId } = req.body;

        // Mark current appointment as completed if provided
        if (currentAppointmentId) {
            await pool.execute(`
                UPDATE appointments 
                SET queue_status = 'completed',
                    status = 'COMPLETED'
                WHERE id = ? AND doctor_id = ?
            `, [currentAppointmentId, doctorId]);
        }

        // Get next patient in queue
        const [nextPatients] = await pool.execute(`
            SELECT 
                a.id,
                a.appointment_date as date,
                a.appointment_time as time,
                a.queue_number,
                a.queue_status,
                a.estimated_time,
                a.reason_for_visit as reason,
                p.id as patient_id,
                p.full_name as patient_name,
                p.email as patient_email,
                p.phone as patient_phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = ? 
            AND a.appointment_date = ?
            AND a.queue_status = 'waiting'
            AND a.status IN ('PENDING', 'ACCEPTED')
            ORDER BY a.queue_number ASC
            LIMIT 1
        `, [doctorId, date]);

        if (nextPatients.length === 0) {
            return res.json({ message: 'No more patients in queue', completed: true });
        }

        const nextPatient = nextPatients[0];

        // Update next patient status to in_progress
        await pool.execute(`
            UPDATE appointments 
            SET queue_status = 'in_progress',
                called_at = NOW()
            WHERE id = ?
        `, [nextPatient.id]);

        // Recalculate estimated times for remaining patients
        await updateEstimatedTimes(doctorId, date);

        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`patient_${nextPatient.patient_id}`).emit('queue_update', {
                status: 'called',
                appointmentId: nextPatient.id,
                message: 'You are being called now!'
            });

            // Notify other waiting patients
            io.to(`doctor_${doctorId}_queue`).emit('queue_updated', {
                date,
                currentPatient: nextPatient
            });
        }

        res.json({
            message: 'Next patient called',
            patient: nextPatient
        });
    } catch (error) {
        console.error('Call next patient error:', error);
        res.status(500).json({ message: 'Server error while calling next patient' });
    }
};

/**
 * Helper function to update estimated times
 */
const updateEstimatedTimes = async (doctorId, date) => {
    const [waitingPatients] = await pool.execute(`
        SELECT id, queue_number FROM appointments 
        WHERE doctor_id = ? AND appointment_date = ? 
        AND queue_status = 'waiting'
        ORDER BY queue_number ASC
    `, [doctorId, date]);

    const avgConsultTime = 15; // 15 minutes
    const now = new Date();

    for (let i = 0; i < waitingPatients.length; i++) {
        const estimatedTime = new Date(now.getTime() + ((i + 1) * avgConsultTime * 60000));
        
        await pool.execute(`
            UPDATE appointments 
            SET estimated_time = ?
            WHERE id = ?
        `, [estimatedTime, waitingPatients[i].id]);
    }
};

/**
 * @desc    Get queue status for a patient
 * @route   GET /api/queue/patient/:appointmentId
 * @access  Private (Patient)
 */
const getPatientQueueStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { appointmentId } = req.params;

        const [appointments] = await pool.execute(`
            SELECT 
                a.id,
                a.appointment_date as date,
                a.appointment_time as time,
                a.queue_number,
                a.queue_status,
                a.estimated_time,
                a.called_at,
                d.full_name as doctor_name,
                d.specialization,
                (SELECT COUNT(*) FROM appointments 
                 WHERE doctor_id = a.doctor_id 
                 AND appointment_date = a.appointment_date 
                 AND queue_status = 'waiting' 
                 AND queue_number < a.queue_number) as patients_before
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.id = ? AND a.patient_id = ?
        `, [appointmentId, userId]);

        if (appointments.length === 0) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        res.json(appointments[0]);
    } catch (error) {
        console.error('Get patient queue status error:', error);
        res.status(500).json({ message: 'Server error while fetching queue status' });
    }
};

/**
 * @desc    Get all queue dates for doctor
 * @route   GET /api/queue/dates
 * @access  Private (Doctor)
 */
const getQueueDates = async (req, res) => {
    try {
        const doctorId = req.user.id;

        const [dates] = await pool.execute(`
            SELECT DISTINCT 
                appointment_date as date,
                COUNT(*) as total_appointments,
                SUM(CASE WHEN queue_status = 'waiting' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN queue_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN queue_status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM appointments
            WHERE doctor_id = ? 
            AND appointment_date >= CURDATE()
            AND status IN ('PENDING', 'ACCEPTED', 'COMPLETED')
            GROUP BY appointment_date
            ORDER BY appointment_date ASC
        `, [doctorId]);

        res.json(dates);
    } catch (error) {
        console.error('Get queue dates error:', error);
        res.status(500).json({ message: 'Server error while fetching queue dates' });
    }
};

/**
 * @desc    Reset queue for a date (start fresh)
 * @route   POST /api/queue/reset
 * @access  Private (Doctor)
 */
const resetQueue = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { date } = req.body;

        // Reset all appointments for this date
        await pool.execute(`
            UPDATE appointments 
            SET queue_status = 'waiting',
                called_at = NULL
            WHERE doctor_id = ? 
            AND appointment_date = ?
            AND queue_status != 'completed'
        `, [doctorId, date]);

        // Reassign queue numbers
        await assignQueueNumbers(doctorId, date);

        res.json({ message: 'Queue reset successfully' });
    } catch (error) {
        console.error('Reset queue error:', error);
        res.status(500).json({ message: 'Server error while resetting queue' });
    }
};

module.exports = {
    getQueueByDate,
    callNextPatient,
    getPatientQueueStatus,
    getQueueDates,
    resetQueue
};
