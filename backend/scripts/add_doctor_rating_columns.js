const pool = require('../config/db');

async function addDoctorColumns() {
    try {
        console.log('Adding rating and review_count columns to doctors table...');

        // Add rating
        try {
            await pool.query("ALTER TABLE doctors ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00");
            console.log('rating column added.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('rating column already exists.');
            else throw e;
        }

        // Add review_count
        try {
            await pool.query("ALTER TABLE doctors ADD COLUMN review_count INT DEFAULT 0");
            console.log('review_count column added.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('review_count column already exists.');
            else throw e;
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addDoctorColumns();
