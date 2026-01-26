
const pool = require('./config/db');

async function debugDeep() {
    try {
        console.log('--- Deep Debugging Queue ---');

        // 1. Check Date
        const [dateResult] = await pool.execute('SELECT CURDATE() as db_date, NOW() as db_now');
        console.log('DB Time:', dateResult[0]);

        const jsDate = new Date().toISOString().split('T')[0];
        console.log('JS Date:', jsDate);

        // 2. Check All Appointments for Today
        const [todaysApts] = await pool.execute(`
            SELECT id, doctor_id, patient_id, appointment_date, status 
            FROM appointments 
            WHERE appointment_date = CURDATE()
        `);
        console.log(`Total Appointments Today (${dateResult[0].db_date}):`, todaysApts.length);
        if (todaysApts.length > 0) {
            console.log('Sample Apt:', todaysApts[0]);
            console.log('Doctor IDs with appts today:', [...new Set(todaysApts.map(a => a.doctor_id))]);
        }

        // 3. Find specific doctor
        const [targetDoc] = await pool.execute("SELECT id, full_name, user_id FROM doctors WHERE full_name LIKE '%Lynn Kihn%'");
        console.log('Target Doctor Result:', JSON.stringify(targetDoc, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

debugDeep();
