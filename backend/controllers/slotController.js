const pool = require('../config/db');

// Helper to get day name from date
const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
};

// @desc    Get all slot definitions for a doctor (Weekly Schedule)
// @route   GET /api/slots/doctor/:doctorId
// @access  Public
const getDoctorSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;

        const [slots] = await pool.execute(`
            SELECT 
                id,
                day_of_week,
                TIME_FORMAT(start_time, '%H:%i') as start_time,
                TIME_FORMAT(end_time, '%H:%i') as end_time,
                consultation_type,
                max_patients,
                slot_duration_minutes,
                is_active
            FROM doctor_slots
            WHERE doctor_id = ? AND is_active = TRUE
            ORDER BY FIELD(day_of_week, 'SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'), start_time
        `, [doctorId]);

        res.json({
            success: true,
            count: slots.length,
            slots
        });
    } catch (error) {
        console.error('❌ Error fetching doctor slots:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctor slots',
            error: error.message
        });
    }
};

// @desc    Get available slots for booking (Session Blocks / Queue Based)
// @route   GET /api/slots/available/:doctorId
// @access  Public
const getAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { startDate, endDate } = req.query;

        console.log(`🔍 [SlotDebug] Request for Doctor: ${doctorId}, Type: ${req.query.appointmentType}, Range: ${startDate || 'Today'} to ${endDate || '+14d'}`);

        // 1. Get Doctor Details & Weekly Schedule Rules
        const [doctorData] = await pool.execute(`
            SELECT 
                d.full_name as doctor_name, 
                d.specialization, 
                d.consultation_fee,
                ds.*
            FROM doctors d
            JOIN doctor_slots ds ON d.id = ds.doctor_id
            WHERE d.id = ? AND ds.is_active = TRUE
        `, [doctorId]);

        if (doctorData.length === 0) {
            return res.json({ success: true, count: 0, slots: [], slotsByDate: {} });
        }

        const doctorInfo = {
            name: doctorData[0].doctor_name,
            specialization: doctorData[0].specialization,
            fee: doctorData[0].consultation_fee
        };

        // 2. Determine Date Range (Default: Today to +14 days)
        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date();
        if (!endDate) end.setDate(start.getDate() + 14);

        // Filter by appointment type if provided
        const content_type_filter = req.query.appointmentType ? req.query.appointmentType.toUpperCase() : null;

        // 3. Get Booking Counts per Session (Grouped by Date + Time)
        // We assume appointments for a session are stored with appointment_time = session.start_time
        // Using DATE() function to handle UTC timestamps properly
        const [bookingCounts] = await pool.execute(`
            SELECT 
                DATE(appointment_date) as appt_date, 
                appointment_time, 
                COUNT(*) as book_count
            FROM appointments
            WHERE doctor_id = ? 
            AND DATE(appointment_date) BETWEEN ? AND ?
            AND status != 'CANCELLED'
            GROUP BY DATE(appointment_date), appointment_time
        `, [doctorId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]);

        // Create a fast lookup map: "YYYY-MM-DD_HH:mm" -> count
        const bookingMap = {};
        bookingCounts.forEach(b => {
            // appt_date is already a Date object representing the date component
            const dateStr = b.appt_date.toISOString().split('T')[0];
            const timeStr = b.appointment_time.substring(0, 5);
            bookingMap[`${dateStr}_${timeStr}`] = b.book_count;
        });

        // 4. Generate Available Sessions
        const generatedSlots = [];
        const slotsByDate = {};

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayName = getDayName(d);

            const dailySchedules = doctorData.filter(s => {
                if (s.day_of_week !== dayName) return false;
                if (content_type_filter) {
                    return s.consultation_type === 'BOTH' || s.consultation_type === content_type_filter;
                }
                return true;
            });

            if (dailySchedules.length > 0) {
                if (!slotsByDate[dateStr]) slotsByDate[dateStr] = [];

                for (const sched of dailySchedules) {
                    const startHM = sched.start_time.substring(0, 5);
                    const endHM = sched.end_time.substring(0, 5);

                    // Identify bookings for this specific session
                    const currentBookings = bookingMap[`${dateStr}_${startHM}`] || 0;
                    const maxPatients = sched.max_patients || 40; // Default if not set

                    const idString = `${sched.id}${dateStr.replace(/-/g, '')}${startHM.replace(':', '')}`;
                    console.log(`🔍 [SlotGen] RuleID:${sched.id} Date:${dateStr} Time:${startHM} -> IDStr:${idString}`);

                    const slotObj = {
                        // Synthetic ID: RuleID + Date + StartTime
                        id: parseInt(idString),
                        slot_date: dateStr,
                        slot_start_time: startHM, // Represents Session Start
                        slot_end_time: endHM,     // Represents Session End
                        appointment_type: sched.consultation_type === 'BOTH' && req.query.appointmentType ? req.query.appointmentType.toLowerCase() : sched.consultation_type.toLowerCase(),
                        max_appointments: maxPatients,
                        current_bookings: currentBookings,
                        available_spots: Math.max(0, maxPatients - currentBookings),
                        doctor_name: doctorInfo.name,
                        specialization: doctorInfo.specialization,
                        consultation_fee: parseFloat(doctorInfo.fee)
                    };

                    // Only push if available
                    if (slotObj.available_spots > 0) {
                        generatedSlots.push(slotObj);
                        slotsByDate[dateStr].push(slotObj);
                    }
                }
            }
        }

        console.log(`✅ [SlotDebug] Returning ${generatedSlots.length} sessions for Doctor ${doctorId}`);

        res.json({
            success: true,
            count: generatedSlots.length,
            slots: generatedSlots,
            slotsByDate
        });

    } catch (error) {
        console.error('❌ Error fetching available slots:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available slots',
            error: error.message
        });
    }
};

// @desc    Create new slot rule (Weekly) - Doctor only
// @route   POST /api/slots
// @access  Private (Doctor)
const createSlots = async (req, res) => {
    try {
        const doctorId = req.user.role === 'DOCTOR' ? req.user.profile_id : req.body.doctorId;
        const {
            dayOfWeek,
            startTime,
            endTime,
            consultationType,
            maxPatients,
            slotDuration
        } = req.body;

        // Validation
        if (!dayOfWeek || !startTime || !endTime || !consultationType) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields (dayOfWeek, startTime, endTime, consultationType)'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO doctor_slots 
             (doctor_id, day_of_week, start_time, end_time, consultation_type, max_patients, slot_duration_minutes) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [doctorId, dayOfWeek, startTime, endTime, consultationType, maxPatients || 40, slotDuration || 0]
        );

        res.status(201).json({
            success: true,
            message: 'Slot schedule created successfully',
            slotId: result.insertId
        });
    } catch (error) {
        console.error('❌ Error creating slot:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create slot',
            error: error.message
        });
    }
};

// @desc    Delete slot rule
// @route   DELETE /api/slots/:id
// @access  Private (Doctor)
const deleteSlot = async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const [slots] = await pool.execute('SELECT doctor_id FROM doctor_slots WHERE id = ?', [id]);
        if (slots.length === 0) return res.status(404).json({ success: false, message: 'Slot not found' });

        if (req.user.role === 'DOCTOR' && slots[0].doctor_id !== req.user.profile_id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await pool.execute('DELETE FROM doctor_slots WHERE id = ?', [id]);

        res.json({ success: true, message: 'Slot deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting slot:', error);
        res.status(500).json({ success: false, message: 'Failed to delete slot', error: error.message });
    }
};

// @desc    Get my slots (for logged in doctor) - Returns Weekly Schedule
// @route   GET /api/slots/my-slots
// @access  Private (Doctor)
const getMySlots = async (req, res) => {
    try {
        const doctorId = req.user.profile_id;

        const [slots] = await pool.execute(`
            SELECT * FROM doctor_slots 
            WHERE doctor_id = ? 
            ORDER BY FIELD(day_of_week, 'SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'), start_time
        `, [doctorId]);

        res.json({
            success: true,
            count: slots.length,
            slots
        });
    } catch (error) {
        console.error('❌ Error fetching my slots:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch slots',
            error: error.message
        });
    }
};

// Placeholder for updateSlot - can be implemented if needed
// @desc    Update slot rule
// @route   PUT /api/slots/:id
// @access  Private (Doctor)
const updateSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, startTime, endTime, maxPatients, consultationType } = req.body;

        // Check ownership
        const [slots] = await pool.execute('SELECT doctor_id FROM doctor_slots WHERE id = ?', [id]);
        if (slots.length === 0) return res.status(404).json({ success: false, message: 'Slot not found' });

        if (req.user.role === 'DOCTOR' && slots[0].doctor_id !== req.user.profile_id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (isActive !== undefined) {
            updates.push('is_active = ?');
            values.push(isActive ? 1 : 0);
        }
        if (startTime) {
            updates.push('start_time = ?');
            values.push(startTime);
        }
        if (endTime) {
            updates.push('end_time = ?');
            values.push(endTime);
        }
        if (maxPatients) {
            updates.push('max_patients = ?');
            values.push(maxPatients);
        }
        if (consultationType) {
            updates.push('consultation_type = ?');
            values.push(consultationType);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(id);
        await pool.execute(
            `UPDATE doctor_slots SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({ success: true, message: 'Slot updated successfully' });
    } catch (error) {
        console.error('❌ Error updating slot:', error);
        res.status(500).json({ success: false, message: 'Failed to update slot', error: error.message });
    }
};

module.exports = {
    getDoctorSlots,
    getAvailableSlots,
    createSlots,
    updateSlot, // kept for route compatibility
    deleteSlot,
    getMySlots
};
