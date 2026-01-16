const express = require('express');
const { getNearbyAmbulances } = require('../controllers/emergencyController');

const router = express.Router();

router.get('/nearby', getNearbyAmbulances);

module.exports = router;