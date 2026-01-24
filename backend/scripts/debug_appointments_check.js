const pool = require('../config/db');

async function checkAppointments() {
    console.log('🔍 Checking Appointments Alignment...');

    // 1. Get raw appointments sample
    const [apts] = await pool.execute(`
        SELECT id, doctor_id, appointment_date, appointment_time, created_at 
        FROM appointments 
        ORDER BY created_at DESC 
        LIMIT 5
    `);
    console.log('Sample Appointments:', apts);

    if (apts.length === 0) {
        console.log('❌ No appointments found!');
        process.exit(0);
    }

    // 2. Check if they match any slot for that doctor
    for (const apt of apts) {
        const date = new Date(apt.appointment_date);
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const dayName = days[date.getDay()];

        console.log(`\nChecking Apt ${apt.id}: Doc ${apt.doctor_id} on ${apt.appointment_date} (${dayName}) at ${apt.appointment_time}`);

        const [rules] = await pool.execute(`
            SELECT * FROM doctor_slots 
            WHERE doctor_id = ? 
            AND day_of_week = ? 
            AND start_time = ?
        `, [apt.doctor_id, dayName, apt.appointment_time]);

        if (rules.length > 0) {
            console.log('   ✅ MATCH! Aligns with Rule ID:', rules[0].id);
        } else {
            console.log('   ❌ NO MATCH! No rule found for this time.');
            // Debug: Show rules for this doctor/day
            const [allRules] = await pool.execute('SELECT * FROM doctor_slots WHERE doctor_id=? AND day_of_week=?', [apt.doctor_id, dayName]);
            console.log('   Stats:', allRules.map(r => `${r.start_time}-${r.end_time}`).join(', '));
        }
    }

    // 3. Count total matching appointments
    const [counts] = await pool.execute(`
        SELECT COUNT(*) as valid_count
        FROM appointments a
        JOIN doctor_slots ds ON a.doctor_id = ds.doctor_id 
            AND ds.day_of_week = DATE_FORMAT(a.appointment_date, '%W')
            AND ds.start_time = a.appointment_time
    `);

    // MySQL %W returns day name (e.g. 'Monday'). Note: My seed uses UPPERCASE 'MONDAY'.
    // DATE_FORMAT names might be mixed case.

    console.log('\nGlobal Alignment Check:');
    // Let's try flexible join
    const [flexible] = await pool.execute(`
        SELECT COUNT(*) as valid_count
        FROM appointments a
        JOIN doctor_slots ds ON a.doctor_id = ds.doctor_id 
            AND UPPER(ds.day_of_week) = UPPER(DATE_FORMAT(a.appointment_date, '%W'))
            AND ds.start_time = a.appointment_time
    `);
    const [total] = await pool.execute('SELECT COUNT(*) as count FROM appointments');

    console.log(`   Valid Aligned Appointments: ${flexible[0].valid_count} / ${total[0].count}`);

    process.exit(0);
}

checkAppointments();
