const express = require('express');
const {
    getHospitalDetails,
    getHospitalDoctors,
    getHospitalResources,
    updateHospitalResource,
    getHospitalAppointments,
    getHospitalQueue,
    addAmbulance,
    updateAmbulance
} = require('../controllers/hospitalAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and HOSPITAL_ADMIN role
router.use(protect);
router.use(authorize('HOSPITAL_ADMIN'));

//  Hospital management
router.get('/hospital', getHospitalDetails);

// Doctor management
router.get('/doctors', getHospitalDoctors);

// Resource management
router.get('/resources', getHospitalResources);
router.put('/resources/:id', updateHospitalResource);

// Appointment monitoring
router.get('/appointments', getHospitalAppointments);

// Live queue monitoring
router.get('/queue', getHospitalQueue);

// Ambulance management
router.post('/ambulances', addAmbulance);
router.put('/ambulances/:id', updateAmbulance);

module.exports = router;
