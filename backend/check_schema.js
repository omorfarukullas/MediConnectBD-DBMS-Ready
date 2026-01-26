
const pool = require('./config/db');

async function checkSchema() {
    try {
        console.log('--- Checking Schema ---');
        const [rows] = await pool.execute("DESCRIBE doctors");
        console.log('Columns:', rows.map(r => r.Field));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkSchema();
