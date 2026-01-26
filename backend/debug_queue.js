
const pool = require('./config/db');

async function debugQueue() {
    try {
        console.log('--- Debugging Queue ---');
        const today = new Date().toISOString().split('T')[0];
        console.log('Server Today (UTC):', today);

        // Get all appointments
        const [rows] = await pool.execute('SELECT id, doctor_id, patient_id, appointment_date, status, consultation_type FROM appointments ORDER BY created_at DESC LIMIT 10');
        console.log('Recent Appointments:', rows);

        // Get all queue entries
        const [qRows] = await pool.execute('SELECT * FROM appointment_queue ORDER BY created_at DESC LIMIT 10');
        console.log('Recent Queue Entries:', qRows);

        // Check specifically for today
        const [todayRows] = await pool.execute('SELECT * FROM appointments WHERE appointment_date = ?', [today]);
        console.log(`Appointments for Today (${today}):`, todayRows.length);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

debugQueue();
