const express = require('express');
const { getDoctors, getDoctorById } = require('../controllers/doctorController');

const router = express.Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);

module.exports = router;