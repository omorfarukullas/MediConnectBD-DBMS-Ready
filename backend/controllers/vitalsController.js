const pool = require('../config/db');

/**
 * @desc    Get patient vitals
 * @route   GET /api/vitals
 * @access  Private (Patient)
 */
/**
 * @desc    Get patient vitals
 * @route   GET /api/vitals
 * @access  Private (Patient)
 */
const getVitals = async (req, res) => {
    try {
        const patientId = req.user.profile_id || req.user.id;

        const [patients] = await pool.execute(
            `SELECT 
                id,
                blood_group,
                height,
                weight,
                full_name,
                phone,
                address,
                date_of_birth,
                updated_at as last_updated
            FROM patients 
            WHERE id = ?`,
            [patientId]
        );

        if (patients.length === 0) {
            return res.json({ vitals: null });
        }

        res.json({ vitals: patients[0] });
    } catch (error) {
        console.error('Get vitals error:', error);
        res.status(500).json({ message: 'Server error while fetching vitals', error: error.message });
    }
};

/**
 * @desc    Update patient vitals
 * @route   PUT /api/vitals
 * @access  Private (Patient)
 */
const updateVitals = async (req, res) => {
    try {
        const patientId = req.user.profile_id || req.user.id;
        const {
            blood_group,
            height,
            weight,
            full_name,
            phone,
            address,
            date_of_birth
        } = req.body;

        // Update patients table with vitals and profile info
        await pool.execute(
            `UPDATE patients SET
                blood_group = COALESCE(?, blood_group),
                height = COALESCE(?, height),
                weight = COALESCE(?, weight),
                full_name = COALESCE(?, full_name),
                phone = COALESCE(?, phone),
                address = COALESCE(?, address),
                date_of_birth = COALESCE(?, date_of_birth),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                blood_group,
                height,
                weight,
                full_name,
                phone,
                address,
                date_of_birth,
                patientId
            ]
        );

        // Fetch updated vitals
        const [updatedPatient] = await pool.execute(
            `SELECT 
                id,
                blood_group,
                height,
                weight,
                full_name,
                phone,
                address,
                date_of_birth,
                updated_at as last_updated
            FROM patients 
            WHERE id = ?`,
            [patientId]
        );

        res.json({
            message: 'Vitals updated successfully',
            vitals: updatedPatient[0]
        });
    } catch (error) {
        console.error('Update vitals error:', error);
        res.status(500).json({ message: 'Server error while updating vitals', error: error.message });
    }
};

module.exports = {
    getVitals,
    updateVitals
};
