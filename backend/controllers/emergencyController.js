const { Ambulance, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const getNearbyAmbulances = async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ message: 'Coordinates required' });
    }

    try {
        // Raw SQL for Geospatial calculation (ST_Distance_Sphere gives meters)
        // 5000 meters = 5km
        const query = `
            SELECT *, 
            ST_Distance_Sphere(point(longitude, latitude), point(${lng}, ${lat})) as distanceValue
            FROM Ambulances
            WHERE status != 'Busy'
            HAVING distanceValue <= 5000
            ORDER BY distanceValue ASC
        `;

        const ambulances = await sequelize.query(query, { type: QueryTypes.SELECT });
        
        // Format distance for UI
        const formatted = ambulances.map(amb => ({
            ...amb,
            distance: (amb.distanceValue / 1000).toFixed(1) + ' km'
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error finding ambulances' });
    }
};

module.exports = { getNearbyAmbulances };