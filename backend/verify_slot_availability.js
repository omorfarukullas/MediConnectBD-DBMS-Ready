const pool = require('./config/db');

(async () => {
    try {
        console.log('\n📊 SLOT AVAILABILITY ANALYSIS\n');
        console.log('='.repeat(70));

        // Get upcoming sessions with their booking counts
        const [sessionStats] = await pool.execute(`
            SELECT 
                d.id as doctor_id,
                d.full_name as doctor_name,
                ds.day_of_week,
                ds.start_time,
                ds.end_time,
                ds.max_patients,
                DATE_ADD(CURDATE(), INTERVAL (
                    CASE ds.day_of_week
                        WHEN 'SUNDAY' THEN 0
                        WHEN 'MONDAY' THEN 1
                        WHEN 'TUESDAY' THEN 2
                        WHEN 'WEDNESDAY' THEN 3
                        WHEN 'THURSDAY' THEN 4
                        WHEN 'FRIDAY' THEN 5
                        WHEN 'SATURDAY' THEN 6
                    END
                ) DAY) as next_session_date
            FROM doctors d
            INNER JOIN doctor_slots ds ON d.id = ds.doctor_id
            WHERE ds.is_active = 1
            LIMIT 15
        `);

        console.log('📅 UPCOMING SESSIONS (Next 7 Days):\n');

        for (const session of sessionStats) {
            const dateStr = session.next_session_date.toISOString().split('T')[0];
            const timeStr = session.start_time.substring(0, 5);

            // Count bookings for this session
            const [bookings] = await pool.execute(`
                SELECT COUNT(*) as count
                FROM appointments
                WHERE doctor_id = ?
                AND DATE(appointment_date) = ?
                AND appointment_time = ?
                AND status != 'CANCELLED'
            `, [session.doctor_id, dateStr, timeStr]);

            const bookedCount = bookings[0].count;
            const available = session.max_patients - bookedCount;
            const percentage = Math.round((bookedCount / session.max_patients) * 100);

            // Visual bar
            const barLength = 20;
            const filledLength = Math.round((bookedCount / session.max_patients) * barLength);
            const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

            console.log(`${session.doctor_name.padEnd(25)} | ${dateStr} ${timeStr}`);
            console.log(`  [${bar}] ${percentage}% | ${available}/${session.max_patients} available`);
            console.log('');
        }

        // Summary statistics
        const [totalStats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT ds.id) as total_sessions,
                SUM(ds.max_patients) as total_capacity,
                (SELECT COUNT(*) FROM appointments WHERE status != 'CANCELLED') as total_bookings
            FROM doctor_slots ds
            WHERE ds.is_active = 1
        `);

        const stats = totalStats[0];
        const avgBookingRate = (stats.total_bookings / stats.total_capacity) * 100;

        console.log('='.repeat(70));
        console.log('📈 OVERALL STATISTICS:\n');
        console.log(`   Total Active Sessions: ${stats.total_sessions}`);
        console.log(`   Total Capacity: ${stats.total_capacity} slots`);
        console.log(`   Total Bookings: ${stats.total_bookings} appointments`);
        console.log(`   Average Booking Rate: ${avgBookingRate.toFixed(1)}%`);
        console.log('');
        console.log(`   ${avgBookingRate < 30 ? '✅' : '⚠️'} Slot availability looks ${avgBookingRate < 30 ? 'GOOD' : 'HIGH'} for testing`);
        console.log('='.repeat(70));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
})();
