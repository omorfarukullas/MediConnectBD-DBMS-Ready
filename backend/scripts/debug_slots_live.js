const pool = require('../config/db');

async function debugSlots() {
    console.log('🔍 Debugging Slots for Doctor...');

    // Get a doctor
    const [docs] = await pool.execute('SELECT id, full_name FROM doctors LIMIT 1');
    if (docs.length === 0) return;
    const doctorId = docs[0].id;
    console.log(`Doctor: ${docs[0].full_name} (${doctorId})`);

    // Get today's bookings
    const today = new Date().toISOString().split('T')[0];
    const [bookings] = await pool.execute(`
        SELECT appointment_time, COUNT(*) as count 
        FROM appointments 
        WHERE doctor_id = ? AND appointment_date = ?
        GROUP BY appointment_time
    `, [doctorId, today]);

    console.log(`Bookings for ${today}:`, bookings);

    // Get Active Rules
    const [rules] = await pool.execute('SELECT * FROM doctor_slots WHERE doctor_id = ? AND is_active=1', [doctorId]);
    console.log('Active Rules:', rules);

    process.exit(0);
}

debugSlots();
