/**
 * Time Validation Middleware
 * Validates if doctor can access patient records based on appointment time
 */

const pool = require('../config/db');

/**
 * Check if current time is within appointment window
 * @param {string} appointmentTime - Combined date and time
 * @param {number} bufferMinutes - Buffer time in minutes (default 15)
 * @returns {boolean}
 */
const isAppointmentActive = (appointmentTime, bufferMinutes = 15) => {
  try {
    const appointmentDate = new Date(appointmentTime);
    const currentDate = new Date();

    // Calculate time window
    const startTime = new Date(appointmentDate.getTime() - bufferMinutes * 60000);
    const endTime = new Date(appointmentDate.getTime() + bufferMinutes * 60000);

    return currentDate >= startTime && currentDate <= endTime;
  } catch (error) {
    console.error('Error validating appointment time:', error);
    return false;
  }
};

/**
 * Middleware to validate doctor has active appointment with patient
 * Use this for prescription creation, document upload, and file download
 */
const validateAppointmentAccess = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const doctorRole = req.user.role;

    // Only apply to doctors
    if (doctorRole !== 'DOCTOR') {
      return next();
    }

    // Get patient ID from request (could be in params, body, or query)
    const patientId = req.params.patientId || req.body.patientId || req.query.patientId;

    if (!patientId) {
      return res.status(400).json({
        message: 'Patient ID is required'
      });
    }

    // Check if doctor has an active appointment with this patient TODAY
    const today = new Date().toISOString().split('T')[0];

    const [appointments] = await pool.execute(
      `SELECT id, appointment_date, appointment_time, status
       FROM appointments 
       WHERE doctor_id = ? 
       AND patient_id = ? 
       AND appointment_date = ?
       AND status IN ('CONFIRMED', 'IN_PROGRESS')
       ORDER BY appointment_time ASC
       LIMIT 1`,
      [doctorId, patientId, today]
    );

    if (appointments.length === 0) {
      return res.status(403).json({
        message: 'No appointment found with this patient today',
        code: 'NO_APPOINTMENT'
      });
    }

    const appointment = appointments[0];
    const appointmentDateTime = `${appointment.appointment_date} ${appointment.appointment_time}`;

    // Check if appointment is currently active (within time window)
    if (!isAppointmentActive(appointmentDateTime, 15)) {
      return res.status(403).json({
        message: 'Access denied: Patient records are only accessible during the scheduled appointment time',
        code: 'TIME_RESTRICTION',
        appointmentTime: appointmentDateTime
      });
    }

    // Store appointment info in request for later use
    req.activeAppointment = appointment;
    next();
  } catch (error) {
    console.error('Error in validateAppointmentAccess:', error);
    return res.status(500).json({
      message: 'Error validating appointment access',
      error: error.message
    });
  }
};

/**
 * Middleware to validate document access for download
 * Checks both privacy settings and time restrictions
 */
const validateDocumentAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const documentId = req.params.id;

    // Get document info
    const [documents] = await pool.execute(
      'SELECT * FROM medical_documents WHERE id = ?',
      [documentId]
    );

    if (documents.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = documents[0];

    // Patients can always access their own documents
    if (userRole === 'PATIENT') {
      if (document.patient_id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      req.document = document;
      return next();
    }

    // For doctors: check privacy and time restrictions
    if (userRole === 'DOCTOR') {
      // Check if document is private (using visibility column)
      if (document.visibility === 'PRIVATE') {
        return res.status(403).json({
          message: 'This document is private and cannot be accessed',
          code: 'PRIVATE_DOCUMENT'
        });
      }

      // Check if doctor has active appointment with patient
      const patientId = document.patient_id;
      const today = new Date().toISOString().split('T')[0];

      const [appointments] = await pool.execute(
        `SELECT id, appointment_date, appointment_time, status
         FROM appointments 
         WHERE doctor_id = ? 
         AND patient_id = ? 
         AND appointment_date = ?
         AND status IN ('CONFIRMED', 'IN_PROGRESS')
         ORDER BY appointment_time ASC
         LIMIT 1`,
        [userId, patientId, today]
      );

      if (appointments.length === 0) {
        return res.status(403).json({
          message: 'No active appointment with this patient',
          code: 'NO_APPOINTMENT'
        });
      }

      const appointment = appointments[0];
      const appointmentDateTime = `${appointment.appointment_date} ${appointment.appointment_time}`;

      // Check time window
      if (!isAppointmentActive(appointmentDateTime, 15)) {
        return res.status(403).json({
          message: 'Access denied: Documents can only be accessed during appointment time',
          code: 'TIME_RESTRICTION'
        });
      }

      req.document = document;
      req.activeAppointment = appointment;
      return next();
    }

    // Other roles - deny access
    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    console.error('Error in validateDocumentAccess:', error);
    return res.status(500).json({
      message: 'Error validating document access',
      error: error.message
    });
  }
};

module.exports = {
  validateAppointmentAccess,
  validateDocumentAccess,
  isAppointmentActive
};
