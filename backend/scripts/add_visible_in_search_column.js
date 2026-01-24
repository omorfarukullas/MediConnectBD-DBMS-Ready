const pool = require('../config/db');

async function addColumn() {
    try {
        console.log('Adding is_visible_in_search column to patients table...');
        await pool.query("ALTER TABLE patients ADD COLUMN is_visible_in_search BOOLEAN DEFAULT FALSE");
        console.log('Column added successfully.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists.');
            process.exit(0);
        }
        console.error('Error:', error);
        process.exit(1);
    }
}

addColumn();
