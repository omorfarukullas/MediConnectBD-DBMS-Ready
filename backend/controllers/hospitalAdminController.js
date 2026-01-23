// ============================================================
// Hospital Admin Controller - Raw SQL Implementation
// For managing hospital resources, doctors, and operations
// ============================================================
const pool = require('../config/db');

// @desc    Get hospital details for the logged-in admin
// @route   GET /api/hospital-admin/hospital
// @access  Private (Hospital Admin only)
const getHospitalDetails = async (req, res) => {
    try {
        const hospitalId = req.user.hospitalId;

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
        const hospitalId = req.user.hospitalId;

        const [doctors] = await pool.execute(
            `SELECT d.id, d.user_id, d.full_name, d.phone, d.specialization, d.qualification,
                    d.bmdc_number, d.consultation_fee, d.experience_years, d.bio, d.hospital_id,
                    u.email
             FROM doctors d
             JOIN users u ON d.user_id = u.id
             WHERE d.hospital_id = ?`,
            [hospitalId]
        );

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
        const hospitalId = req.user.hospitalId;

        // Get all resource data
        const [resources] = await pool.execute(
            'SELECT * FROM hospital_resources WHERE hospital_id = ?',
            [hospitalId]
        );

        const [departments] = await pool.execute(
            'SELECT * FROM departments WHERE hospital_id = ?',
            [hospitalId]
        );

        const [tests] = await pool.execute(
            'SELECT * FROM tests WHERE hospital_id = ?',
            [hospitalId]
        );

        const [ambulances] = await pool.execute(
            'SELECT * FROM ambulances WHERE hospital_id = ?',
            [hospitalId]
        );

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
        const { available_beds, total_beds } = req.body;

        const [result] = await pool.execute(
            `UPDATE hospital_resources 
             SET available_beds = ?, total_beds = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND hospital_id = ?`,
            [available_beds, total_beds, id, req.user.hospitalId]
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
        const hospitalId = req.user.hospitalId;

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
        const hospitalId = req.user.hospitalId;

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
        const { vehicle_number, driver_name, driver_phone, type } = req.body;
        const hospitalId = req.user.hospitalId;

        const [result] = await pool.execute(
            `INSERT INTO ambulances (hospital_id, vehicle_number, driver_name, driver_phone, type, is_available)
             VALUES (?, ?, ?, ?, ?, TRUE)`,
            [hospitalId, vehicle_number, driver_name, driver_phone, type || 'Advanced']
        );

        res.status(201).json({
            message: 'Ambulance added successfully',
            ambulanceId: result.insertId
        });
    } catch (error) {
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
        const { is_available } = req.body;

        const [result] = await pool.execute(
            `UPDATE ambulances 
             SET is_available = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND hospital_id = ?`,
            [is_available, id, req.user.hospitalId]
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

module.exports = {
    getHospitalDetails,
    getHospitalDoctors,
    getHospitalResources,
    updateHospitalResource,
    getHospitalAppointments,
    getHospitalQueue,
    addAmbulance,
    updateAmbulance
};
