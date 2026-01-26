
const pool = require('./config/db');

async function checkUsersSchema() {
    try {
        console.log('--- Checking Schema for Users ---');
        const [rows] = await pool.execute("DESCRIBE users");
        console.log('Columns:', rows.map(r => r.Field));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUsersSchema();
