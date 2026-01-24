const express = require('express');
const {
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
} = require('../controllers/hospitalAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and HOSPITAL_ADMIN role
router.use(protect);
router.use(authorize('HOSPITAL_ADMIN'));

// ============================================================
// HOSPITAL MANAGEMENT
// ============================================================
router.get('/hospital', getHospitalDetails);

// ============================================================
// DOCTOR MANAGEMENT
// ============================================================
router.get('/doctors', getHospitalDoctors);
router.post('/doctors', addDoctor);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);
router.get('/doctors/:id/appointments', getDoctorAppointments);

// ============================================================
// RESOURCE MANAGEMENT
// ============================================================
router.get('/resources', getHospitalResources);
router.post('/resources', addResource);
router.put('/resources/:id', updateHospitalResource);

// ============================================================
// DEPARTMENTS MANAGEMENT
// ============================================================
router.post('/departments', addDepartment);
router.put('/departments/:id', updateDepartment);

// ============================================================
// TESTS MANAGEMENT
// ============================================================
router.post('/tests', addTest);
router.put('/tests/:id', updateTest);
router.delete('/tests/:id', deleteTest);

// ============================================================
// AMBULANCE MANAGEMENT
// ============================================================
router.post('/ambulances', addAmbulance);
router.put('/ambulances/:id', updateAmbulance);
router.delete('/ambulances/:id', deleteAmbulance);

// ============================================================
// DOCTOR SCHEDULE MANAGEMENT
// ============================================================
router.get('/schedules', getAllDoctorSchedules); // Overview of all doctors
router.get('/doctors/:doctorId/slots', getDoctorSlots); // Get slots for specific doctor
router.post('/doctors/:doctorId/slots', addDoctorSlot); // Add new slot
router.put('/slots/:slotId', updateDoctorSlot); // Update slot
router.delete('/slots/:slotId', deleteDoctorSlot); // Delete slot
router.patch('/slots/:slotId/toggle', toggleSlotStatus); // Toggle active status

// ============================================================
// MONITORING
// ============================================================
router.get('/appointments', getHospitalAppointments);
router.get('/queue', getHospitalQueue);

module.exports = router;
