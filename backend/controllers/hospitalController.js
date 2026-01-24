const pool = require('../config/db');

/**
 * @desc    Get hospital resources (public - for patients viewing hospitals)
 * @route   GET /api/hospitals/:hospitalId/resources
 * @access  Public
 */
const getPublicHospitalResources = async (req, res) => {
    try {
        const { hospitalId } = req.params;

        // Get all resource data in parallel
        const [
            [resources],
            [departments],
            [tests]
        ] = await Promise.all([
            pool.execute('SELECT * FROM hospital_resources WHERE hospital_id = ?', [hospitalId]),
            pool.execute('SELECT id, name, description FROM departments WHERE hospital_id = ?', [hospitalId]),
            pool.execute(
                `SELECT t.id, t.name, t.cost, t.description, d.name as department_name 
                 FROM tests t
                 JOIN departments d ON t.department_id = d.id
                 WHERE d.hospital_id = ?
                 ORDER BY d.name, t.name`,
                [hospitalId]
            )
        ]);

        // Get hospital basic info
        const [hospitalInfo] = await pool.execute(
            'SELECT id, name, address, city, contact_phone as phone, contact_email as email FROM hospitals WHERE id = ?',
            [hospitalId]
        );

        if (hospitalInfo.length === 0) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        res.json({
            hospital: hospitalInfo[0],
            resources,
            departments,
            tests
        });
    } catch (error) {
        console.error('❌ Error fetching public hospital resources:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get list of all hospitals (public - for patient browsing)
 * @route   GET /api/hospitals
 * @access  Public
 */
const getPublicHospitals = async (req, res) => {
    try {
        const [hospitals] = await pool.execute(
            'SELECT id, name, address, city, contact_phone as phone, contact_email as email FROM hospitals WHERE is_active = 1 ORDER BY name'
        );

        res.json(hospitals);
    } catch (error) {
        console.error('❌ Error fetching hospitals:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getPublicHospitalResources,
    getPublicHospitals
};
