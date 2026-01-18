/**
 * USAGE EXAMPLES
 * How to integrate the Doctor Appointment and Patient Portal components
 */

// ============================================================
// Example 1: Doctor Portal - Appointment List Integration
// ============================================================

import React from 'react';
import { DoctorAppointmentList } from '../components/DoctorAppointmentList';
import { api } from '../services/apiClient';

function DoctorDashboard() {
  const [appointments, setAppointments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.getAppointments();
      setAppointments(response.data || response);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Appointments</h1>
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <DoctorAppointmentList 
          appointments={appointments}
          onRefresh={fetchAppointments}
        />
      )}
    </div>
  );
}

// ============================================================
// Example 2: Patient Portal - Medical History Integration
// ============================================================

import { PatientMedicalHistory } from '../components/PatientMedicalHistory';

function PatientDashboard() {
  return (
    <div className="container mx-auto p-6">
      <PatientMedicalHistory />
    </div>
  );
}

// ============================================================
// Example 3: Using Time Validation Utilities
// ============================================================

import { 
  isAppointmentActive, 
  isAppointmentUpcoming,
  formatTime,
  getTimeUntilAppointment
} from '../utils/timeValidation';

function AppointmentCard({ appointment }) {
  const appointmentTime = `${appointment.date} ${appointment.time}`;
  const isActive = isAppointmentActive(appointmentTime);
  const isUpcoming = isAppointmentUpcoming(appointmentTime);
  const timeUntil = getTimeUntilAppointment(appointmentTime);

  return (
    <div className="appointment-card">
      <h3>{appointment.patientName}</h3>
      <p>Time: {formatTime(appointment.time)}</p>
      
      {isActive && (
        <span className="badge-success">Active Now - Can Access Records</span>
      )}
      
      {isUpcoming && (
        <span className="badge-warning">Upcoming in {timeUntil}</span>
      )}
      
      {!isActive && !isUpcoming && (
        <span className="badge-gray">Past Appointment</span>
      )}
    </div>
  );
}

// ============================================================
// Example 4: Conditional Rendering Based on Time & Privacy
// ============================================================

function MedicalRecordItem({ record, userRole, appointmentTime }) {
  const isActiveAppointment = isAppointmentActive(appointmentTime);
  
  // For doctors: filter out private documents and check time validity
  if (userRole === 'DOCTOR') {
    // Don't show private documents to doctors
    if (record.isPrivate) {
      return null;
    }
    
    // Can only download during active appointment time
    const canDownload = isActiveAppointment;
    
    return (
      <div className="record-item">
        <span>{record.fileName}</span>
        <button 
          disabled={!canDownload}
          onClick={() => downloadFile(record.id)}
        >
          {canDownload ? 'Download' : 'Time Expired'}
        </button>
      </div>
    );
  }
  
  // For patients: always show all records, no time restrictions
  if (userRole === 'PATIENT') {
    return (
      <div className="record-item">
        <span>{record.fileName}</span>
        
        {/* Privacy toggle */}
        <button onClick={() => togglePrivacy(record.id)}>
          {record.isPrivate ? 'Make Public' : 'Make Private'}
        </button>
        
        {/* Always allow download for patients */}
        <button onClick={() => downloadFile(record.id)}>
          Download
        </button>
      </div>
    );
  }
  
  return null;
}

// ============================================================
// Example 5: Backend API Integration (Routes to add)
// ============================================================

/**
 * Backend routes needed for full functionality:
 * 
 * PRESCRIPTIONS:
 * POST   /api/prescriptions              - Create new prescription
 * GET    /api/prescriptions              - Get current user's prescriptions
 * GET    /api/prescriptions/patient/:id  - Get patient's prescriptions (doctors only)
 * 
 * DOCUMENTS:
 * POST   /api/documents/upload           - Upload document
 * GET    /api/documents                  - Get current user's documents
 * GET    /api/documents/patient/:id      - Get patient documents (filter by isPrivate)
 * PATCH  /api/documents/:id/privacy      - Update document privacy setting
 * GET    /api/documents/:id/download     - Download document (time-gated for doctors)
 * DELETE /api/documents/:id              - Delete document
 * 
 * APPOINTMENTS:
 * GET    /api/appointments/my            - Get current user's appointments
 * 
 * Sample Backend Controller (documentController.js):
 */

/*
const updateDocumentPrivacy = async (req, res) => {
  const { id } = req.params;
  const { isPrivate } = req.body;
  const userId = req.user.id;

  try {
    // Verify ownership
    const [docs] = await pool.execute(
      'SELECT * FROM medical_documents WHERE id = ? AND patient_id = ?',
      [id, userId]
    );

    if (docs.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Update privacy
    await pool.execute(
      'UPDATE medical_documents SET is_private = ? WHERE id = ?',
      [isPrivate, id]
    );

    res.json({ message: 'Privacy setting updated', isPrivate });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPatientDocuments = async (req, res) => {
  const { patientId } = req.params;
  const requestingUserId = req.user.id;
  const requestingUserRole = req.user.role;

  try {
    let query = 'SELECT * FROM medical_documents WHERE patient_id = ?';
    const params = [patientId];

    // If doctor is requesting, filter out private documents
    if (requestingUserRole === 'DOCTOR') {
      query += ' AND is_private = FALSE';
    }

    const [documents] = await pool.execute(query, params);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
*/

// ============================================================
// Example 6: Database Schema Updates Needed
// ============================================================

/**
 * Add to medical_documents table:
 * 
 * ALTER TABLE medical_documents 
 * ADD COLUMN is_private BOOLEAN DEFAULT FALSE;
 * 
 * Create prescriptions table:
 * 
 * CREATE TABLE prescriptions (
 *   id INT PRIMARY KEY AUTO_INCREMENT,
 *   patient_id INT NOT NULL,
 *   doctor_id INT NOT NULL,
 *   appointment_id INT,
 *   diagnosis TEXT NOT NULL,
 *   medicines JSON NOT NULL,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *   FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
 *   FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
 *   FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
 * );
 */

export {
  DoctorDashboard,
  PatientDashboard,
  AppointmentCard,
  MedicalRecordItem
};
