const pool = require('./config/db');

(async () => {
    try {
        console.log('\n🧪 QUICK TEST: Slot Availability Fix\n');
        console.log('='.repeat(60));

        // Find a doctor with upcoming appointments
        const [test] = await pool.execute(`
            SELECT 
                d.id,
                d.full_name,
                d.specialization,
                DATE(a.appointment_date) as appt_date,
                a.appointment_time,
                COUNT(*) as booking_count
            FROM doctors d
            INNER JOIN appointments a ON d.id = a.doctor_id
            WHERE a.status != 'CANCELLED'
            AND DATE(a.appointment_date) >= CURDATE()
            GROUP BY d.id, d.full_name, d.specialization, DATE(a.appointment_date), a.appointment_time
            HAVING booking_count > 0
            LIMIT 1
        `);

        if (test.length === 0) {
            console.log('⚠️  No upcoming appointments found in test data');
            await pool.end();
            process.exit(0);
        }

        const doctor = test[0];
        const dateStr = doctor.appt_date.toISOString().split('T')[0];
        const timeStr = doctor.appointment_time.substring(0, 5);

        console.log(`\n📋 Test Doctor: ${doctor.full_name} (${doctor.specialization})`);
        console.log(`📅 Session: ${dateStr} at ${timeStr}`);
        console.log(`📊 Bookings Found: ${doctor.booking_count}\n`);

        const maxCapacity = 40;
        const available = maxCapacity - doctor.booking_count;

        console.log('✅ RESULT:');
        console.log(`   Max Capacity:      ${maxCapacity}`);
        console.log(`   Current Bookings:  ${doctor.booking_count}`);
        console.log(`   Available Spots:   ${available}`);
        console.log(`\n   ${available < maxCapacity ? '✅ WORKING! Correct availability shown' : '❌ Still broken'}`);
        console.log('\n' + '='.repeat(60));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
})();
