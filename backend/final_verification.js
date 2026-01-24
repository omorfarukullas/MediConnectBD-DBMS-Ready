const pool = require('./config/db');

(async () => {
    try {
        const doctorId = 40013; // Dr. Brent Ortiz

        console.log('🧪 FINAL VERIFICATION TEST\n');
        console.log('='.repeat(60));

        // Today and tomorrow
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        console.log(`📅 Current Date: ${todayStr} (${today.toLocaleDateString('en-US', { weekday: 'long' })})`);
        console.log(`📅 Tomorrow: ${tomorrowStr} (${tomorrow.toLocaleDateString('en-US', { weekday: 'long' })})`);
        console.log('='.repeat(60));

        // Test 1: Check what's actually in the database
        const [allAppts] = await pool.execute(`
            SELECT 
                id,
                DATE(appointment_date) as appt_date_only,
                appointment_time,
                status
            FROM appointments 
            WHERE doctor_id = ? 
            AND status != 'CANCELLED'
            ORDER BY DATE(appointment_date), appointment_time
        `, [doctorId]);

        console.log(`\n📋 ALL APPOINTMENTS FOR DR. BRENT (${allAppts.length} total):`);
        allAppts.forEach(a => {
            const dateStr = a.appt_date_only.toISOString().split('T')[0];
            console.log(`  - ${dateStr} at ${a.appointment_time} (ID: ${a.id}, Status: ${a.status})`);
        });

        // Test 2: Run the FIXED booking count query for today
        console.log(`\n🔍 TESTING SLOT AVAILABILITY FOR TODAY (${todayStr}):`);
        console.log('-'.repeat(60));

        const [todayBookings] = await pool.execute(`
            SELECT 
                DATE(appointment_date) as appt_date, 
                appointment_time, 
                COUNT(*) as book_count
            FROM appointments
            WHERE doctor_id = ? 
            AND DATE(appointment_date) = ?
            AND status != 'CANCELLED'
            GROUP BY DATE(appointment_date), appointment_time
        `, [doctorId, todayStr]);

        console.log(`Bookings found: ${todayBookings.length}`);
        todayBookings.forEach(b => {
            console.log(`  ${b.appointment_time}: ${b.book_count} booking(s)`);
        });

        // Test 3: Simulate slot availability calculation for the 09:00 slot
        const slot0900Bookings = todayBookings.find(b => b.appointment_time.substring(0, 5) === '09:00')?.book_count || 0;
        const maxPatients = 40;
        const available0900 = maxPatients - slot0900Bookings;

        console.log(`\n✅ SLOT AVAILABILITY CALCULATION (Today at 09:00):`);
        console.log(`  Max Capacity: ${maxPatients}`);
        console.log(`  Current Bookings: ${slot0900Bookings}`);
        console.log(`  Available Spots: ${available0900}`);
        console.log(`  Status: ${available0900 === maxPatients ? '❌ BUG STILL EXISTS' : '✅ FIXED!'}`);

        // Test 4: Simulate what the frontend would see
        console.log(`\n🌐 WHAT THE FRONTEND WILL SEE:`);
        console.log('-'.repeat(60));
        console.log(`  Book Appointment for Dr. Brent Ortiz`);
        console.log(`  Today (${todayStr}) - 9:00 AM to 2:00 PM`);
        console.log(`  Available Spots: ${available0900} / ${maxPatients}`);

        if (available0900 === 39) {
            console.log(`\n🎉 SUCCESS! The system is now showing the correct availability.`);
            console.log(`   There is 1 appointment booked, so 39 spots are available.`);
        } else if (available0900 === 40) {
            console.log(`\n⚠️ ISSUE: Still showing all 40 spots available!`);
            console.log(`   There should be 39 spots available (1 is booked).`);
        }

        console.log('\n' + '='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
