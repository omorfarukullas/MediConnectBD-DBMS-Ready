
const pool = require('./config/db');

async function checkPatientsSchema() {
    try {
        console.log('--- Checking Schema for Patients ---');
        const [rows] = await pool.execute("DESCRIBE patients");
        console.log('Columns:', rows.map(r => r.Field));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkPatientsSchema();
