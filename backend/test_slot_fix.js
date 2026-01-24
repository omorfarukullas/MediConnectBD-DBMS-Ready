const pool = require('./config/db');

(async () => {
    try {
        const doctorId = 40013; // Dr. Brent Ortiz

        console.log('🧪 Testing the fixed slot availability logic...\n');

        // Simulate the request
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 2); // Today + 2 days

        console.log(`📅 Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

        // Run the FIXED query
        const [bookingCounts] = await pool.execute(`
            SELECT 
                DATE(appointment_date) as appt_date, 
                appointment_time, 
                COUNT(*) as book_count
            FROM appointments
            WHERE doctor_id = ? 
            AND DATE(appointment_date) BETWEEN ? AND ?
            AND status != 'CANCELLED'
            GROUP BY DATE(appointment_date), appointment_time
        `, [doctorId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

        console.log('📊 Booking Counts Found:');
        bookingCounts.forEach(b => {
            console.log(`  Date: ${b.appt_date.toISOString().split('T')[0]}, Time: ${b.appointment_time}, Count: ${b.book_count}`);
        });

        // Build the booking map
        const bookingMap = {};
        bookingCounts.forEach(b => {
            const dateStr = b.appt_date.toISOString().split('T')[0];
            const timeStr = b.appointment_time.substring(0, 5);
            bookingMap[`${dateStr}_${timeStr}`] = b.book_count;
        });

        console.log('\n🗺️  Booking Map:');
        console.log(JSON.stringify(bookingMap, null, 2));

        // Test specific slots
        const todayStr = startDate.toISOString().split('T')[0];
        const slot1Key = `${todayStr}_09:00`;
        const slot1Bookings = bookingMap[slot1Key] || 0;
        const slot1Available = 40 - slot1Bookings;

        console.log(`\n✅ Test Result for Today (${todayStr}) at 09:00:`);
        console.log(`   Max Patients: 40`);
        console.log(`   Current Bookings: ${slot1Bookings}`);
        console.log(`   Available Spots: ${slot1Available}`);
        console.log(`   ${slot1Available < 40 ? '✅ FIXED! Showing correct availability' : '⚠️  Still showing all slots available'}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
