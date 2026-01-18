/**
 * Prescription Controller
 * Handles prescription creation and retrieval with time-gated access
 */

const pool = require('../config/db');

/**
 * Create new prescription
 * POST /api/prescriptions
 * Requires: validateAppointmentAccess middleware
 */
const createPrescription = async (req, res) => {
  const { patientId, appointmentId, diagnosis, medicines } = req.body;
  const doctorId = req.user.id;

  try {
    // Validate required fields
    if (!patientId || !diagnosis || !medicines || !Array.isArray(medicines)) {
      return res.status(400).json({ 
        message: 'Please provide patientId, diagnosis, and medicines array' 
      });
    }

    // Validate medicines array
    if (medicines.length === 0) {
      return res.status(400).json({ 
        message: 'At least one medicine is required' 
      });
    }

    // Validate each medicine has required fields
    for (const med of medicines) {
      if (!med.name || !med.dosage || !med.duration || !med.instruction) {
        return res.status(400).json({ 
          message: 'Each medicine must have name, dosage, duration, and instruction' 
        });
      }
    }

    // Insert prescription with public visibility by default
    const [result] = await pool.execute(
      `INSERT INTO prescriptions 
       (patient_id, doctor_id, appointment_id, diagnosis, medicines, visibility, created_at) 
       VALUES (?, ?, ?, ?, ?, 'public', NOW())`,
      [patientId, doctorId, appointmentId || null, diagnosis, JSON.stringify(medicines)]
    );

    const prescriptionId = result.insertId;

    // Get doctor name for response
    const [doctors] = await pool.execute(
      'SELECT full_name FROM doctors WHERE id = ?',
      [doctorId]
    );

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription: {
        id: prescriptionId,
        patientId,
        doctorId,
        doctorName: doctors[0]?.full_name || 'Unknown',
        appointmentId,
        diagnosis,
        medicines,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ 
      message: 'Server error creating prescription',
      error: error.message 
    });
  }
};

/**
 * Get current user's prescriptions
 * GET /api/prescriptions
 */
const getPrescriptions = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let query;
    let params;

    if (userRole === 'PATIENT') {
      // Get prescriptions for this patient (all visibility levels)
      query = `
        SELECT p.*, d.full_name as doctor_name
        FROM prescriptions p
        LEFT JOIN doctors d ON p.doctor_id = d.id
        WHERE p.patient_id = ?
        ORDER BY p.created_at DESC
      `;
      params = [userId];
    } else if (userRole === 'DOCTOR') {
      // Get prescriptions written by this doctor (only public ones)
      query = `
        SELECT p.*, pt.full_name as patient_name
        FROM prescriptions p
        LEFT JOIN patients pt ON p.patient_id = pt.id
        WHERE p.doctor_id = ? AND (p.visibility = 'public' OR p.visibility IS NULL)
        ORDER BY p.created_at DESC
      `;
      params = [userId];
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [prescriptions] = await pool.execute(query, params);

    // Parse medicines JSON with null safety
    const formattedPrescriptions = prescriptions.map(p => ({
      id: p.id,
      patientId: p.patient_id,
      patientName: p.patient_name,
      doctorId: p.doctor_id,
      doctorName: p.doctor_name,
      appointmentId: p.appointment_id,
      diagnosis: p.diagnosis,
      medicines: p.medicines ? JSON.parse(p.medicines) : [],
      date: p.created_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    res.json(formattedPrescriptions);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ 
      message: 'Server error fetching prescriptions',
      error: error.message 
    });
  }
};

/**
 * Get prescriptions for a specific patient
 * GET /api/prescriptions/patient/:patientId
 * For doctors: requires validateAppointmentAccess middleware
 */
const getPatientPrescriptions = async (req, res) => {
  const { patientId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Patients can only view their own prescriptions
    if (userRole === 'PATIENT' && parseInt(patientId) !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // For doctors, check patient's privacy settings first
    if (userRole === 'DOCTOR') {
      const [patientSettings] = await pool.execute(
        'SELECT share_medical_history FROM patients WHERE id = ?',
        [patientId]
      );
      
      if (patientSettings.length === 0) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      
      // If patient has disabled sharing medical history, return empty array
      if (!patientSettings[0].share_medical_history) {
        console.log(`🔒 Patient ${patientId} has disabled medical history sharing`);
        return res.json([]);
      }
    }

    // For doctors, filter only public prescriptions
    let query = `SELECT p.*, d.full_name as doctor_name
       FROM prescriptions p
       LEFT JOIN doctors d ON p.doctor_id = d.id
       WHERE p.patient_id = ?`;
    
    // Doctors can only see public prescriptions
    if (userRole === 'DOCTOR') {
      query += ' AND (p.visibility = "public" OR p.visibility IS NULL)';
    }
    
    query += ' ORDER BY p.created_at DESC';

    const [prescriptions] = await pool.execute(query, [patientId]);

    // Parse medicines JSON with null safety
    const formattedPrescriptions = prescriptions.map(p => ({
      id: p.id,
      patientId: p.patient_id,
      doctorId: p.doctor_id,
      doctorName: p.doctor_name,
      appointmentId: p.appointment_id,
      diagnosis: p.diagnosis,
      medicines: p.medicines ? JSON.parse(p.medicines) : [],
      date: p.created_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    res.json(formattedPrescriptions);
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    res.status(500).json({ 
      message: 'Server error fetching prescriptions',
      error: error.message 
    });
  }
};

/**
 * Update prescription visibility
 * PATCH /api/prescriptions/:id/visibility
 * Patient only
 */
const updatePrescriptionVisibility = async (req, res) => {
  const { id } = req.params;
  const { visibility } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Only patients can update visibility
    if (userRole !== 'PATIENT') {
      return res.status(403).json({ message: 'Only patients can update prescription visibility' });
    }

    // Validate visibility value
    if (!['private', 'public'].includes(visibility)) {
      return res.status(400).json({ message: 'Invalid visibility value. Must be "private" or "public"' });
    }

    // Verify prescription belongs to user
    const [prescriptions] = await pool.execute(
      'SELECT patient_id FROM prescriptions WHERE id = ?',
      [id]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    if (prescriptions[0].patient_id !== userId) {
      return res.status(403).json({ message: 'You can only update your own prescriptions' });
    }

    // Update visibility
    await pool.execute(
      'UPDATE prescriptions SET visibility = ? WHERE id = ?',
      [visibility, id]
    );

    res.json({ 
      message: 'Prescription visibility updated successfully',
      visibility 
    });
  } catch (error) {
    console.error('Error updating prescription visibility:', error);
    res.status(500).json({ 
      message: 'Server error updating visibility',
      error: error.message 
    });
  }
};

module.exports = {
  createPrescription,
  getPrescriptions,
  getPatientPrescriptions,
  updatePrescriptionVisibility
};
