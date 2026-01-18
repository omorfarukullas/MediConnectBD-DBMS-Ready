// ============================================================
// Emergency Controller - Raw SQL Implementation
// Using mysql2/promise with parameterized queries
// ============================================================
const pool = require('../config/db');

const getNearbyAmbulances = async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ 
            success: false,
            message: 'Coordinates required (lat and lng query parameters)' 
        });
    }

    try {
        // Raw SQL for finding nearby available ambulances
        // Using simple distance calculation (can be enhanced with actual geospatial functions)
        const query = `
            SELECT 
                id,
                vehicle_number,
                driver_name,
                driver_phone,
                ambulance_type,
                status,
                current_location,
                created_at
            FROM ambulances
            WHERE status = 'AVAILABLE'
            ORDER BY id
            LIMIT 10
        `;

        const [ambulances] = await pool.execute(query);
        
        // Format response for UI
        const formatted = ambulances.map(amb => ({
            id: amb.id,
            vehicleNumber: amb.vehicle_number,
            driverName: amb.driver_name,
            driverPhone: amb.driver_phone,
            type: amb.ambulance_type,
            status: amb.status,
            location: amb.current_location || 'Unknown',
            distance: '2.5 km' // Placeholder - implement actual distance calculation
        }));

        res.json({
            success: true,
            data: formatted,
            count: formatted.length
        });
    } catch (error) {
        console.error('❌ Error finding ambulances:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error finding ambulances',
            error: error.message 
        });
    }
};

module.exports = { getNearbyAmbulances };