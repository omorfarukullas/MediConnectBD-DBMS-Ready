// ============================================================
// Hospital Admin Controller - Raw SQL Implementation
// For managing hospital resources, doctors, and operations
// ============================================================
const pool = require('../config/db');
const bcrypt = require('bcrypt');

// @desc    Get hospital details for the logged-in admin
// @route   GET /api/hospital-admin/hospital
// @access  Private (Hospital Admin only)
const getHospitalDetails = async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id;

        if (!hospitalId) {
            return res.status(400).json({ message: 'Hospital ID not found for this admin' });
        }

        const [hospitals] = await pool.execute(
            `SELECT * FROM hospitals WHERE id = ?`,
            [hospitalId]
        );

        if (hospitals.length === 0) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        res.json(hospitals[0]);
    } catch (error) {
        console.error('❌ Error fetching hospital details:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all doctors for the admin's hospital
// @route   GET /api/hospital-admin/doctors
// @access  Private (Hospital Admin only)
const getHospitalDoctors = async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id;
        console.log('🏥 Fetching doctors for hospital ID:', hospitalId);

        const [doctors] = await pool.execute(
            `SELECT d.id, d.user_id, d.full_name, d.phone, d.specialization, d.qualification,
                    d.bmdc_number, d.consultation_fee, d.experience_years, d.bio, d.hospital_id,
                    u.email
             FROM doctors d
             JOIN users u ON d.user_id = u.id
             WHERE d.hospital_id = ?`,
            [hospitalId]
        );

        console.log(`✅ Found ${doctors.length} doctors for hospital ${hospitalId}`);
        if (doctors.length > 0) {
            console.log('Sample doctor:', {
                id: doctors[0].id,
                full_name: doctors[0].full_name,
                email: doctors[0].email
            });
        }

        res.json(doctors);
    } catch (error) {
        console.error('❌ Error fetching hospital doctors:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get hospital resources (beds, departments, tests, ambulances)
// @route   GET /api/hospital-admin/resources
// @access  Private (Hospital Admin only)
const getHospitalResources = async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id;

        // Get all resource data in parallel for optimization
        const [
            [resources],
            [departments],
            [tests],
            [ambulances]
        ] = await Promise.all([
            pool.execute('SELECT * FROM hospital_resources WHERE hospital_id = ?', [hospitalId]),
            pool.execute('SELECT * FROM departments WHERE hospital_id = ?', [hospitalId]),
            pool.execute(
                `SELECT t.*, d.name as department_name 
                 FROM tests t
                 JOIN departments d ON t.department_id = d.id
                 WHERE d.hospital_id = ?`,
                [hospitalId]
            ),
            pool.execute('SELECT * FROM ambulances WHERE hospital_id = ?', [hospitalId])
        ]);

        res.json({
            resources,
            departments,
            tests,
            ambulances
        });
    } catch (error) {
        console.error('❌ Error fetching hospital resources:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update hospital resource (beds)
// @route   PUT /api/hospital-admin/resources/:id
// @access  Private (Hospital Admin only)
const updateHospitalResource = async (req, res) => {
    try {
        const { id } = req.params;
        const { available, total_capacity } = req.body;

        const [result] = await pool.execute(
            `UPDATE hospital_resources 
             SET available = ?, total_capacity = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND hospital_id = ?`,
            [available, total_capacity, id, req.user.hospital_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        res.json({ message: 'Resource updated successfully' });
    } catch (error) {
        console.error('❌ Error updating resource:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all appointments for the hospital
// @route   GET /api/hospital-admin/appointments
// @access  Private (Hospital Admin only)
const getHospitalAppointments = async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id;

        const [appointments] = await pool.execute(
            `SELECT a.*, 
                    p.full_name as patient_name, 
                    d.full_name as doctor_name,
                    d.specialization
             FROM appointments a
             JOIN patients p ON a.patient_id = p.id
             JOIN doctors d ON a.doctor_id = d.id
             WHERE d.hospital_id = ?
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [hospitalId]
        );

        res.json(appointments);
    } catch (error) {
        console.error('❌ Error fetching appointments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get live queue for all doctors in the hospital
// @route   GET /api/hospital-admin/queue
// @access  Private (Hospital Admin only)
const getHospitalQueue = async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id;

        const [queue] = await pool.execute(
            `SELECT aq.*, 
                    a.appointment_date, a.appointment_time,
                    p.full_name as patient_name,
                    d.full_name as doctor_name, d.specialization
             FROM appointment_queue aq
             JOIN appointments a ON aq.appointment_id = a.id
             JOIN patients p ON a.patient_id = p.id
             JOIN doctors d ON a.doctor_id = d.id
             WHERE d.hospital_id = ? AND aq.status != 'COMPLETED'
             ORDER BY d.id, aq.queue_number ASC`,
            [hospitalId]
        );

        res.json(queue);
    } catch (error) {
        console.error('❌ Error fetching queue:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add new ambulance
// @route   POST /api/hospital-admin/ambulances
// @access  Private (Hospital Admin only)
const addAmbulance = async (req, res) => {
    try {
        const { vehicle_number, driver_name, driver_phone, ambulance_type } = req.body;
        const hospitalId = req.user.hospital_id;

        const [result] = await pool.execute(
            `INSERT INTO ambulances (hospital_id, vehicle_number, driver_name, driver_phone, ambulance_type, status)
             VALUES (?, ?, ?, ?, ?, 'AVAILABLE')`,
            [hospitalId, vehicle_number, driver_name, driver_phone, ambulance_type || 'BASIC']
        );

        res.status(201).json({
            message: 'Ambulance added successfully',
            ambulanceId: result.insertId
        });
    } catch (error) {
        // Handle duplicate vehicle number
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Vehicle number already exists' });
        }
        console.error('❌ Error adding ambulance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update ambulance availability
// @route   PUT /api/hospital-admin/ambulances/:id
// @access  Private (Hospital Admin only)
const updateAmbulance = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [result] = await pool.execute(
            `UPDATE ambulances 
             SET status = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND hospital_id = ?`,
            [status, id, req.user.hospital_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Ambulance not found' });
        }

        res.json({ message: 'Ambulance updated successfully' });
    } catch (error) {
        console.error('❌ Error updating ambulance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ============================================================
// DOCTOR MANAGEMENT
// ============================================================

// @desc    Add new doctor to the hospital
// @route   POST /api/hospital-admin/doctors
// @access  Private (Hospital Admin only)
const addDoctor = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { email, password, name, specialization, consultation_fee, experience_years } = req.body;
        const hospitalId = req.user.hospital_id;

        console.log('📝 Adding doctor with data:', { email, name, specialization, hospitalId });

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, password, and name are required' });
        }

        if (!hospitalId) {
            console.error('❌ No hospital_id found for user:', req.user);
            return res.status(400).json({ message: 'Hospital ID not found for this admin' });
        }

        // Check if email already exists
        const [existingUser] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        await connection.beginTransaction();

        // 1. Create user account
        const hashedPassword = await bcrypt.hash(password, 10);

        const [userResult] = await connection.execute(
            `INSERT INTO users (email, password, role) VALUES (?, ?, 'DOCTOR')`,
            [email, hashedPassword]
        );
        const userId = userResult.insertId;
        console.log('✅ User created with ID:', userId);

        // 2. Create doctor profile
        const [doctorResult] = await connection.execute(
            `INSERT INTO doctors (user_id, hospital_id, full_name, specialization, consultation_fee, experience_years)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, hospitalId, name, specialization, consultation_fee || 0, experience_years || 0]
        );
        console.log('✅ Doctor profile created with ID:', doctorResult.insertId);

        await connection.commit();

        res.status(201).json({
            message: 'Doctor added successfully',
            doctorId: doctorResult.insertId,
            userId: userId,
            credentials: { email, temporaryPassword: password }
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error adding doctor:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
};

// @desc    Update doctor details
// @route   PUT /api/hospital-admin/doctors/:id
// @access  Private (Hospital Admin only)
const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, specialization, consultation_fee, experience_years, phone, bio } = req.body;

        // Verify ownership (doctor belongs to admin's hospital)
        const [result] = await pool.execute(
            `UPDATE doctors 
             SET full_name = ?, specialization = ?, consultation_fee = ?, 
                 experience_years = ?, phone = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND hospital_id = ?`,
            [name, specialization, consultation_fee, experience_years, phone, bio, id, req.user.hospital_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Doctor not found or unauthorized' });
        }

        res.json({ message: 'Doctor updated successfully' });
    } catch (error) {
        console.error('❌ Error updating doctor:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Remove doctor from the hospital
// @route   DELETE /api/hospital-admin/doctors/:id
// @access  Private (Hospital Admin only)
const deleteDoctor = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Get user_id before deleting doctor
        const [doctor] = await connection.execute(
            'SELECT user_id FROM doctors WHERE id = ? AND hospital_id = ?',
            [id, req.user.hospital_id]
        );

        if (doctor.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Doctor not found or unauthorized' });
        }

        // Delete doctor (cascade will handle slots and appointments)
        await connection.execute(
            'DELETE FROM doctors WHERE id = ? AND hospital_id = ?',
            [id, req.user.hospital_id]
        );

        // Delete user account
        await connection.execute(
            'DELETE FROM users WHERE id = ?',
            [doctor[0].user_id]
        );

        await connection.commit();
        res.json({ message: 'Doctor removed successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error deleting doctor:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
};

// @desc    Get specific doctor's appointments
// @route   GET /api/hospital-admin/doctors/:id/appointments
// @access  Private (Hospital Admin only)
const getDoctorAppointments = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                p.name as patient_name,
                p.phone as patient_phone,
                aq.queue_number
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
            WHERE a.doctor_id = ?
        `;
        const params = [id];

        if (startDate) {
            query += ' AND a.appointment_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND a.appointment_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

        const [appointments] = await pool.execute(query, params);

        res.json(appointments);
    } catch (error) {
        console.error('❌ Error fetching doctor appointments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ============================================================
// RESOURCES & DEPARTMENTS MANAGEMENT
// ============================================================

// @desc    Add new hospital resource (beds)
// @route   POST /api/hospital-admin/resources
// @access  Private (Hospital Admin only)
const addResource = async (req, res) => {
    try {
        const { resource_type, total_capacity, available } = req.body;
        const hospitalId = req.user.hospital_id;

        const [result] = await pool.execute(
            `INSERT INTO hospital_resources (hospital_id, resource_type, total_capacity, available)
             VALUES (?, ?, ?, ?)`,
            [hospitalId, resource_type, total_capacity, available]
        );

        res.status(201).json({
            message: 'Resource added successfully',
            resourceId: result.insertId
        });
    } catch (error) {
        console.error('❌ Error adding resource:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add new department
// @route   POST /api/hospital-admin/departments
// @access  Private (Hospital Admin only)
const addDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;
        const hospitalId = req.user.hospital_id;

        const [result] = await pool.execute(
            `INSERT INTO departments (hospital_id, name, description)
             VALUES (?, ?, ?)`,
            [hospitalId, name, description]
        );

        res.status(201).json({
            message: 'Department added successfully',
            departmentId: result.insertId
        });
    } catch (error) {
        console.error('❌ Error adding department:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update department details
// @route   PUT /api/hospital-admin/departments/:id
// @access  Private (Hospital Admin only)
const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, is_active } = req.body;

        const [result] = await pool.execute(
            `UPDATE departments 
             SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND hospital_id = ?`,
            [name, description, is_active, id, req.user.hospital_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Department not found' });
        }

        res.json({ message: 'Department updated successfully' });
    } catch (error) {
        console.error('❌ Error updating department:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add test to department
// @route   POST /api/hospital-admin/tests
// @access  Private (Hospital Admin only)
const addTest = async (req, res) => {
    try {
        const { department_id, name, description, cost, duration_minutes } = req.body;

        // Verify department belongs to admin's hospital
        const [department] = await pool.execute(
            'SELECT id FROM departments WHERE id = ? AND hospital_id = ?',
            [department_id, req.user.hospital_id]
        );

        if (department.length === 0) {
            return res.status(404).json({ message: 'Department not found or unauthorized' });
        }

        const [result] = await pool.execute(
            `INSERT INTO tests (department_id, name, description, cost, duration_minutes)
             VALUES (?, ?, ?, ?, ?)`,
            [department_id, name, description, cost, duration_minutes]
        );

        res.status(201).json({
            message: 'Test added successfully',
            testId: result.insertId
        });
    } catch (error) {
        console.error('❌ Error adding test:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update test details
// @route   PUT /api/hospital-admin/tests/:id
// @access  Private (Hospital Admin only)
const updateTest = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, cost, duration_minutes, is_available } = req.body;

        // Verify test belongs to admin's hospital through department
        const [result] = await pool.execute(
            `UPDATE tests t
             JOIN departments d ON t.department_id = d.id
             SET t.name = ?, t.description = ?, t.cost = ?, 
                 t.duration_minutes = ?, t.is_available = ?, t.updated_at = CURRENT_TIMESTAMP
             WHERE t.id = ? AND d.hospital_id = ?`,
            [name, description, cost, duration_minutes, is_available, id, req.user.hospital_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Test not found or unauthorized' });
        }

        res.json({ message: 'Test updated successfully' });
    } catch (error) {
        console.error('❌ Error updating test:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete test
// @route   DELETE /api/hospital-admin/tests/:id
// @access  Private (Hospital Admin only)
const deleteTest = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify test belongs to admin's hospital through department
        const [result] = await pool.execute(
            `DELETE t FROM tests t
             JOIN departments d ON t.department_id = d.id
             WHERE t.id = ? AND d.hospital_id = ?`,
            [id, req.user.hospital_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Test not found or unauthorized' });
        }

        res.json({ message: 'Test deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting test:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ============================================================
// AMBULANCE MANAGEMENT (Extended)
// ============================================================

// @desc    Delete ambulance
// @route   DELETE /api/hospital-admin/ambulances/:id
// @access  Private (Hospital Admin only)
const deleteAmbulance = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.execute(
            'DELETE FROM ambulances WHERE id = ? AND hospital_id = ?',
            [id, req.user.hospital_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Ambulance not found' });
        }

        res.json({ message: 'Ambulance deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting ambulance:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};



// ============================================================
// DOCTOR SCHEDULE MANAGEMENT
// ============================================================

// @desc    Get all time slots for a specific doctor
// @route   GET /api/hospital-admin/doctors/:doctorId/slots
// @access  Private (Hospital Admin only)
const getDoctorSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const hospitalId = req.user.hospital_id;

        // Verify doctor belongs to admin's hospital
        const [doctor] = await pool.execute(
            'SELECT id FROM doctors WHERE id = ? AND hospital_id = ?',
            [doctorId, hospitalId]
        );

        if (doctor.length === 0) {
            return res.status(404).json({ message: 'Doctor not found or unauthorized' });
        }

        // Get all slots for this doctor
        const [slots] = await pool.execute(
            `SELECT id, doctor_id, day_of_week, start_time, end_time, 
                    max_patients, consultation_duration, is_active, created_at
             FROM doctor_slots
             WHERE doctor_id = ?
             ORDER BY 
                FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
                start_time`,
            [doctorId]
        );

        res.json(slots);
    } catch (error) {
        console.error('❌ Error fetching doctor slots:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get schedule overview for all doctors in hospital
// @route   GET /api/hospital-admin/schedules
// @access  Private (Hospital Admin only)
const getAllDoctorSchedules = async (req, res) => {
    try {
        const hospitalId = req.user.hospital_id;

        // Get all doctors with slot counts
        const [schedules] = await pool.execute(
            `SELECT 
                d.id,
                d.full_name as name,
                d.specialization,
                COUNT(ds.id) as total_slots,
                SUM(CASE WHEN ds.is_active = 1 THEN 1 ELSE 0 END) as active_slots,
                SUM(CASE WHEN ds.is_active = 0 THEN 1 ELSE 0 END) as inactive_slots
             FROM doctors d
             LEFT JOIN doctor_slots ds ON d.id = ds.doctor_id
             WHERE d.hospital_id = ?
             GROUP BY d.id, d.full_name, d.specialization
             ORDER BY d.full_name`,
            [hospitalId]
        );

        res.json(schedules);
    } catch (error) {
        console.error('❌ Error fetching schedules:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add new time slot for a doctor
// @route   POST /api/hospital-admin/doctors/:doctorId/slots
// @access  Private (Hospital Admin only)
const addDoctorSlot = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { day_of_week, start_time, end_time, max_patients, consultation_duration } = req.body;
        const hospitalId = req.user.hospital_id;

        // Verify doctor belongs to admin's hospital
        const [doctor] = await pool.execute(
            'SELECT id FROM doctors WHERE id = ? AND hospital_id = ?',
            [doctorId, hospitalId]
        );

        if (doctor.length === 0) {
            return res.status(404).json({ message: 'Doctor not found or unauthorized' });
        }

        // Check for conflicting slots
        const [conflicts] = await pool.execute(
            `SELECT id FROM doctor_slots
             WHERE doctor_id = ? AND day_of_week = ?
             AND ((start_time < ? AND end_time > ?) OR
                  (start_time < ? AND end_time > ?) OR
                  (start_time >= ? AND end_time <= ?))`,
            [doctorId, day_of_week, end_time, start_time, end_time, end_time, start_time, end_time]
        );

        if (conflicts.length > 0) {
            return res.status(400).json({ message: 'Time slot conflicts with existing schedule' });
        }

        // Insert new slot
        const [result] = await pool.execute(
            `INSERT INTO doctor_slots (doctor_id, day_of_week, start_time, end_time, max_patients, consultation_duration, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [doctorId, day_of_week, start_time, end_time, max_patients, consultation_duration]
        );

        res.status(201).json({
            message: 'Time slot added successfully',
            slotId: result.insertId
        });
    } catch (error) {
        console.error('❌ Error adding slot:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update existing time slot
// @route   PUT /api/hospital-admin/slots/:slotId
// @access  Private (Hospital Admin only)
const updateDoctorSlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        const { day_of_week, start_time, end_time, max_patients, consultation_duration, is_active } = req.body;
        const hospitalId = req.user.hospital_id;

        // Verify slot belongs to doctor in admin's hospital
        const [slot] = await pool.execute(
            `SELECT ds.id, ds.doctor_id 
             FROM doctor_slots ds
             JOIN doctors d ON ds.doctor_id = d.id
             WHERE ds.id = ? AND d.hospital_id = ?`,
            [slotId, hospitalId]
        );

        if (slot.length === 0) {
            return res.status(404).json({ message: 'Slot not found or unauthorized' });
        }

        const doctorId = slot[0].doctor_id;

        // Check for conflicts (excluding current slot)
        const [conflicts] = await pool.execute(
            `SELECT id FROM doctor_slots
             WHERE doctor_id = ? AND day_of_week = ? AND id != ?
             AND ((start_time < ? AND end_time > ?) OR
                  (start_time < ? AND end_time > ?) OR
                  (start_time >= ? AND end_time <= ?))`,
            [doctorId, day_of_week, slotId, end_time, start_time, end_time, end_time, start_time, end_time]
        );

        if (conflicts.length > 0) {
            return res.status(400).json({ message: 'Updated time conflicts with existing schedule' });
        }

        // Update slot
        await pool.execute(
            `UPDATE doctor_slots
             SET day_of_week = ?, start_time = ?, end_time = ?, 
                 max_patients = ?, consultation_duration = ?, is_active = ?
             WHERE id = ?`,
            [day_of_week, start_time, end_time, max_patients, consultation_duration, is_active, slotId]
        );

        res.json({ message: 'Time slot updated successfully' });
    } catch (error) {
        console.error('❌ Error updating slot:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete time slot
// @route   DELETE /api/hospital-admin/slots/:slotId
// @access  Private (Hospital Admin only)
const deleteDoctorSlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        const hospitalId = req.user.hospital_id;

        // Verify slot belongs to doctor in admin's hospital
        const [slot] = await pool.execute(
            `SELECT ds.id 
             FROM doctor_slots ds
             JOIN doctors d ON ds.doctor_id = d.id
             WHERE ds.id = ? AND d.hospital_id = ?`,
            [slotId, hospitalId]
        );

        if (slot.length === 0) {
            return res.status(404).json({ message: 'Slot not found or unauthorized' });
        }

        // Check for future appointments (optional - you can decide to allow or block)
        // For now, we'll allow deletion but you might want to add this check

        // Delete slot
        await pool.execute('DELETE FROM doctor_slots WHERE id = ?', [slotId]);

        res.json({ message: 'Time slot deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting slot:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Toggle slot active/inactive status
// @route   PATCH /api/hospital-admin/slots/:slotId/toggle
// @access  Private (Hospital Admin only)
const toggleSlotStatus = async (req, res) => {
    try {
        const { slotId } = req.params;
        const hospitalId = req.user.hospital_id;

        // Verify slot belongs to doctor in admin's hospital
        const [slot] = await pool.execute(
            `SELECT ds.id, ds.is_active 
             FROM doctor_slots ds
             JOIN doctors d ON ds.doctor_id = d.id
             WHERE ds.id = ? AND d.hospital_id = ?`,
            [slotId, hospitalId]
        );

        if (slot.length === 0) {
            return res.status(404).json({ message: 'Slot not found or unauthorized' });
        }

        const newStatus = slot[0].is_active ? 0 : 1;

        // Toggle status
        await pool.execute(
            'UPDATE doctor_slots SET is_active = ? WHERE id = ?',
            [newStatus, slotId]
        );

        res.json({
            message: 'Slot status updated successfully',
            is_active: newStatus
        });
    } catch (error) {
        console.error('❌ Error toggling slot status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


module.exports = {
    // Hospital Info
    getHospitalDetails,

    // Doctor Management
    getHospitalDoctors,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    getDoctorAppointments,

    // Resources Management
    getHospitalResources,
    updateHospitalResource,
    addResource,

    // Departments & Tests
    addDepartment,
    updateDepartment,
    addTest,
    updateTest,
    deleteTest,

    // Ambulance Management
    addAmbulance,
    updateAmbulance,
    deleteAmbulance,

    // Appointments & Queue
    getHospitalAppointments,
    getHospitalQueue,

    // Doctor Schedule Management
    getDoctorSlots,
    getAllDoctorSchedules,
    addDoctorSlot,
    updateDoctorSlot,
    deleteDoctorSlot,
    toggleSlotStatus
};
