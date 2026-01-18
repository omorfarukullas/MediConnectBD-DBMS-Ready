const pool = require('../config/db');

/**
 * @desc    Get patient vitals
 * @route   GET /api/vitals
 * @access  Private (Patient)
 */
const getVitals = async (req, res) => {
    try {
        const userId = req.user.id;

        const [vitals] = await pool.execute(
            `SELECT 
                id,
                blood_group,
                height,
                weight,
                blood_pressure,
                heart_rate,
                temperature,
                oxygen_saturation,
                allergies,
                chronic_conditions,
                current_medications,
                emergency_contact_name,
                emergency_contact_phone,
                last_updated
            FROM patient_vitals 
            WHERE user_id = ?`,
            [userId]
        );

        if (vitals.length === 0) {
            return res.json({ vitals: null });
        }

        res.json({ vitals: vitals[0] });
    } catch (error) {
        console.error('Get vitals error:', error);
        res.status(500).json({ message: 'Server error while fetching vitals' });
    }
};

/**
 * @desc    Update or create patient vitals
 * @route   PUT /api/vitals
 * @access  Private (Patient)
 */
const updateVitals = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            blood_group,
            height,
            weight,
            blood_pressure,
            heart_rate,
            temperature,
            oxygen_saturation,
            allergies,
            chronic_conditions,
            current_medications,
            emergency_contact_name,
            emergency_contact_phone
        } = req.body;

        // Check if vitals exist
        const [existing] = await pool.execute(
            'SELECT id FROM patient_vitals WHERE user_id = ?',
            [userId]
        );

        if (existing.length > 0) {
            // Update existing vitals
            await pool.execute(
                `UPDATE patient_vitals SET
                    blood_group = COALESCE(?, blood_group),
                    height = COALESCE(?, height),
                    weight = COALESCE(?, weight),
                    blood_pressure = COALESCE(?, blood_pressure),
                    heart_rate = COALESCE(?, heart_rate),
                    temperature = COALESCE(?, temperature),
                    oxygen_saturation = COALESCE(?, oxygen_saturation),
                    allergies = COALESCE(?, allergies),
                    chronic_conditions = COALESCE(?, chronic_conditions),
                    current_medications = COALESCE(?, current_medications),
                    emergency_contact_name = COALESCE(?, emergency_contact_name),
                    emergency_contact_phone = COALESCE(?, emergency_contact_phone),
                    last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ?`,
                [
                    blood_group,
                    height,
                    weight,
                    blood_pressure,
                    heart_rate,
                    temperature,
                    oxygen_saturation,
                    allergies,
                    chronic_conditions,
                    current_medications,
                    emergency_contact_name,
                    emergency_contact_phone,
                    userId
                ]
            );
        } else {
            // Create new vitals record
            await pool.execute(
                `INSERT INTO patient_vitals (
                    user_id,
                    blood_group,
                    height,
                    weight,
                    blood_pressure,
                    heart_rate,
                    temperature,
                    oxygen_saturation,
                    allergies,
                    chronic_conditions,
                    current_medications,
                    emergency_contact_name,
                    emergency_contact_phone
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    blood_group,
                    height,
                    weight,
                    blood_pressure,
                    heart_rate,
                    temperature,
                    oxygen_saturation,
                    allergies,
                    chronic_conditions,
                    current_medications,
                    emergency_contact_name,
                    emergency_contact_phone
                ]
            );
        }

        // Fetch updated vitals
        const [updatedVitals] = await pool.execute(
            `SELECT 
                id,
                blood_group,
                height,
                weight,
                blood_pressure,
                heart_rate,
                temperature,
                oxygen_saturation,
                allergies,
                chronic_conditions,
                current_medications,
                emergency_contact_name,
                emergency_contact_phone,
                last_updated
            FROM patient_vitals 
            WHERE user_id = ?`,
            [userId]
        );

        res.json({
            message: 'Vitals updated successfully',
            vitals: updatedVitals[0]
        });
    } catch (error) {
        console.error('Update vitals error:', error);
        res.status(500).json({ message: 'Server error while updating vitals' });
    }
};

module.exports = {
    getVitals,
    updateVitals
};
