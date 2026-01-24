const pool = require('./config/db');

(async () => {
    try {
        console.log('\n✅ SLOT AVAILABILITY VERIFICATION\n');

        // Check total appointments vs capacity
        const [stats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM doctor_slots WHERE is_active = 1) as total_slots,
                (SELECT SUM(max_patients) FROM doctor_slots WHERE is_active = 1) as total_capacity,
                (SELECT COUNT(*) FROM appointments WHERE status != 'CANCELLED') as total_bookings
        `);

        const { total_slots, total_capacity, total_bookings } = stats[0];
        const bookingRate = (total_bookings / total_capacity * 100).toFixed(1);

        console.log('📊 Database Statistics:');
        console.log(`   Active Slots: ${total_slots}`);
        console.log(`   Total Capacity: ${total_capacity} spots`);
        console.log(`   Total Bookings: ${total_bookings} appointments`);
        console.log(`   Booking Rate: ${bookingRate}%`);
        console.log('');

        // Sample a few doctors to show varied availability
        const [samples] = await pool.execute(`
            SELECT 
                d.full_name,
                COUNT(a.id) as appointment_count
            FROM doctors d
            LEFT JOIN appointments a ON d.id = a.doctor_id AND a.status != 'CANCELLED'
            GROUP BY d.id, d.full_name
            ORDER BY appointment_count DESC
            LIMIT 10
        `);

        console.log('👥 Sample Doctor Booking Counts:');
        samples.forEach(s => {
            const bar = '█'.repeat(Math.min(s.appointment_count, 10)) + '░'.repeat(Math.max(0, 10 - s.appointment_count));
            console.log(`   ${s.full_name.padEnd(30)} [${bar}] ${s.appointment_count} appointments`);
        });

        console.log('');
        if (bookingRate < 30) {
            console.log('✅ PERFECT! Slot availability is realistic (not too full)');
            console.log('   Most slots will show available spaces for booking');
        } else {
            console.log('⚠️  Booking rate is high - many slots might appear full');
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
})();
