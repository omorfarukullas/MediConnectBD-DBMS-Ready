const pool = require('../config/db');

// @desc    Get all slots for a doctor
// @route   GET /api/slots/doctor/:doctorId
// @access  Public
const getDoctorSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { appointmentType, date } = req.query;

        let query = `
            SELECT 
                ds.id,
                ds.slot_date,
                ds.slot_start_time,
                ds.slot_end_time,
                ds.appointment_type,
                ds.max_appointments,
                ds.current_bookings,
                (ds.max_appointments - ds.current_bookings) AS available_spots,
                ds.is_active
            FROM doctor_slots ds
            WHERE ds.doctor_id = ? 
            AND ds.is_active = TRUE
            AND ds.slot_date >= CURDATE()
        `;

        const params = [doctorId];

        if (appointmentType) {
            query += ' AND ds.appointment_type = ?';
            params.push(appointmentType);
        }

        if (date) {
            query += ' AND ds.slot_date = ?';
            params.push(date);
        }

        query += ' ORDER BY ds.slot_date, ds.slot_start_time';

        const [slots] = await pool.execute(query, params);

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

// @desc    Get available slots for booking
// @route   GET /api/slots/available/:doctorId
// @access  Public
const getAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { appointmentType, startDate, endDate } = req.query;

        let query = `
            SELECT 
                ds.id,
                ds.slot_date,
                ds.slot_start_time,
                ds.slot_end_time,
                ds.appointment_type,
                ds.max_appointments,
                ds.current_bookings,
                (ds.max_appointments - ds.current_bookings) AS available_spots,
                d.name AS doctor_name,
                d.specialization,
                d.consultation_fee
            FROM doctor_slots ds
            JOIN doctors d ON ds.doctor_id = d.id
            WHERE ds.doctor_id = ? 
            AND ds.is_active = TRUE
            AND ds.slot_date >= CURDATE()
            AND ds.current_bookings < ds.max_appointments
        `;

        const params = [doctorId];

        if (appointmentType) {
            query += ' AND ds.appointment_type = ?';
            params.push(appointmentType);
        }

        if (startDate) {
            query += ' AND ds.slot_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND ds.slot_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY ds.slot_date, ds.slot_start_time';

        const [slots] = await pool.execute(query, params);

        // Group slots by date
        const slotsByDate = slots.reduce((acc, slot) => {
            const date = slot.slot_date.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(slot);
            return acc;
        }, {});

        res.json({
            success: true,
            count: slots.length,
            slots,
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

// @desc    Create new slot(s) - Doctor only
// @route   POST /api/slots
// @access  Private (Doctor)
const createSlots = async (req, res) => {
    try {
        console.log('📥 Received slot creation request');
        console.log('User:', req.user);
        console.log('Body:', req.body);
        
        const doctorId = req.user.role === 'DOCTOR' ? req.user.id : req.body.doctorId;
        const { 
            slotDate, 
            slotStartTime, 
            slotEndTime, 
            appointmentType, 
            maxAppointments,
            recurring,
            endDate
        } = req.body;

        console.log('Doctor ID:', doctorId);
        console.log('Slot Data:', { slotDate, slotStartTime, slotEndTime, appointmentType, maxAppointments });

        // Ensure time format is HH:mm:ss
        const formatTime = (time) => {
            if (time && time.length === 5) return time + ':00';
            return time;
        };
        const formattedStartTime = formatTime(slotStartTime);
        const formattedEndTime = formatTime(slotEndTime);

        console.log('Formatted times:', { formattedStartTime, formattedEndTime });

        // Validation
        if (!slotDate || !slotStartTime || !slotEndTime || !appointmentType) {
            console.log('❌ Validation failed: Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        if (new Date(slotDate) < new Date().setHours(0, 0, 0, 0)) {
            console.log('❌ Validation failed: Past date');
            return res.status(400).json({
                success: false,
                message: 'Cannot create slots for past dates'
            });
        }

        const slots = [];

        if (recurring && endDate) {
            // Create recurring slots
            const start = new Date(slotDate);
            const end = new Date(endDate);
            const dayOfWeek = start.getDay();

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === dayOfWeek) {
                    const dateStr = d.toISOString().split('T')[0];
                    
                    // Check if slot already exists
                    const [existing] = await pool.execute(
                        `SELECT id FROM doctor_slots 
                         WHERE doctor_id = ? AND slot_date = ? 
                         AND slot_start_time = ? AND slot_end_time = ? 
                         AND appointment_type = ?`,
                        [doctorId, dateStr, formattedStartTime, formattedEndTime, appointmentType]
                    );

                    if (existing.length === 0) {
                        const [result] = await pool.execute(
                            `INSERT INTO doctor_slots 
                             (doctor_id, slot_date, slot_start_time, slot_end_time, 
                              appointment_type, max_appointments) 
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [doctorId, dateStr, formattedStartTime, formattedEndTime, 
                             appointmentType, maxAppointments || 1]
                        );
                        slots.push({ id: result.insertId, date: dateStr });
                    }
                }
            }
        } else {
            // Create single slot
            console.log('🔨 Creating single slot...');
            const [result] = await pool.execute(
                `INSERT INTO doctor_slots 
                 (doctor_id, slot_date, slot_start_time, slot_end_time, 
                  appointment_type, max_appointments) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [doctorId, slotDate, formattedStartTime, formattedEndTime, 
                 appointmentType, maxAppointments || 1]
            );
            console.log('✅ Slot created with ID:', result.insertId);
            slots.push({ id: result.insertId, date: slotDate });
        }

        console.log(`✅ Successfully created ${slots.length} slot(s)`);
        
        res.status(201).json({
            success: true,
            message: `Successfully created ${slots.length} slot(s)`,
            slots
        });
    } catch (error) {
        console.error('❌ Error creating slots:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create slots',
            error: error.message
        });
    }
};

// @desc    Update slot
// @route   PUT /api/slots/:id
// @access  Private (Doctor)
const updateSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            slotDate, 
            slotStartTime, 
            slotEndTime, 
            maxAppointments,
            isActive 
        } = req.body;

        // Check if slot exists and belongs to doctor
        const [slots] = await pool.execute(
            'SELECT * FROM doctor_slots WHERE id = ?',
            [id]
        );

        if (slots.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Slot not found'
            });
        }

        const slot = slots[0];

        // Verify ownership for doctors
        if (req.user.role === 'DOCTOR' && slot.doctor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this slot'
            });
        }

        // Check if there are existing bookings
        if (slot.current_bookings > 0 && maxAppointments && maxAppointments < slot.current_bookings) {
            return res.status(400).json({
                success: false,
                message: `Cannot reduce max appointments below current bookings (${slot.current_bookings})`
            });
        }

        const updates = [];
        const params = [];

        if (slotDate) {
            updates.push('slot_date = ?');
            params.push(slotDate);
        }
        if (slotStartTime) {
            updates.push('slot_start_time = ?');
            params.push(slotStartTime);
        }
        if (slotEndTime) {
            updates.push('slot_end_time = ?');
            params.push(slotEndTime);
        }
        if (maxAppointments !== undefined) {
            updates.push('max_appointments = ?');
            params.push(maxAppointments);
        }
        if (isActive !== undefined) {
            updates.push('is_active = ?');
            params.push(isActive ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        params.push(id);

        await pool.execute(
            `UPDATE doctor_slots SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        res.json({
            success: true,
            message: 'Slot updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating slot:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update slot',
            error: error.message
        });
    }
};

// @desc    Delete slot
// @route   DELETE /api/slots/:id
// @access  Private (Doctor)
const deleteSlot = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if slot exists
        const [slots] = await pool.execute(
            'SELECT * FROM doctor_slots WHERE id = ?',
            [id]
        );

        if (slots.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Slot not found'
            });
        }

        const slot = slots[0];

        // Verify ownership for doctors
        if (req.user.role === 'DOCTOR' && slot.doctor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this slot'
            });
        }

        // Check if there are bookings
        if (slot.current_bookings > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete slot with existing bookings (${slot.current_bookings}). Please deactivate instead.`
            });
        }

        await pool.execute('DELETE FROM doctor_slots WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Slot deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting slot:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete slot',
            error: error.message
        });
    }
};

// @desc    Get my slots (for logged in doctor)
// @route   GET /api/slots/my-slots
// @access  Private (Doctor)
const getMySlots = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { upcoming } = req.query;

        let query = `
            SELECT 
                ds.id,
                ds.slot_date,
                ds.slot_start_time,
                ds.slot_end_time,
                ds.appointment_type,
                ds.max_appointments,
                ds.current_bookings,
                (ds.max_appointments - ds.current_bookings) AS available_spots,
                ds.is_active,
                COUNT(a.id) AS total_appointments
            FROM doctor_slots ds
            LEFT JOIN appointments a ON ds.id = a.slot_id AND a.status != 'cancelled'
            WHERE ds.doctor_id = ?
        `;

        const params = [doctorId];

        if (upcoming === 'true') {
            query += ' AND ds.slot_date >= CURDATE()';
        }

        query += `
            GROUP BY ds.id
            ORDER BY ds.slot_date, ds.slot_start_time
        `;

        const [slots] = await pool.execute(query, params);

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

module.exports = {
    getDoctorSlots,
    getAvailableSlots,
    createSlots,
    updateSlot,
    deleteSlot,
    getMySlots
};
