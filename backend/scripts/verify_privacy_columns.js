const pool = require('../config/db');

async function checkColumns() {
    try {
        console.log('Checking patients table columns...');
        const [rows] = await pool.query("SHOW COLUMNS FROM patients LIKE 'share_medical_history'");
        const [rows2] = await pool.query("SHOW COLUMNS FROM patients LIKE 'is_visible_in_search'");

        console.log('share_medical_history exists:', rows.length > 0);
        console.log('is_visible_in_search exists:', rows2.length > 0);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
