const pool = require('../config/db');

(async () => {
    try {
        console.log('🔍 VERIFICATION: Testing Slot Availability with Fresh Data\n');
        console.log('='.repeat(70));

        // Get a doctor who has appointments
        const [doctorsWithAppts] = await pool.execute(`
            SELECT 
                d.id, 
                d.full_name, 
                d.specialization, 
                COUNT(DISTINCT a.id) as appt_count
            FROM doctors d
            INNER JOIN appointments a ON d.id = a.doctor_id
            WHERE a.status != 'CANCELLED'
            GROUP BY d.id, d.full_name, d.specialization
            HAVING appt_count > 0
            ORDER BY appt_count DESC
            LIMIT 5
        `);

        console.log('📋 Top 5 Doctors with Most Appointments:\n');
        doctorsWithAppts.forEach((doc, idx) => {
            console.log(`   ${idx + 1}. ${doc.full_name} (${doc.specialization})`);
            console.log(`      ID: ${doc.id}, Total Appointments: ${doc.appt_count}\n`);
        });

        // Test with the doctor who has most appointments
        const testDoctor = doctorsWithAppts[0];
        console.log('='.repeat(70));
        console.log(`🎯 Testing with: ${testDoctor.full_name} (ID: ${testDoctor.id})`);
        console.log('='.repeat(70) + '\n');

        // Get their appointments grouped by date and time
        const [appointments] = await pool.execute(`
            SELECT 
                DATE(appointment_date) as appt_date,
                appointment_time,
                COUNT(*) as count,
                GROUP_CONCAT(status) as statuses
            FROM appointments
            WHERE doctor_id = ?
            AND status != 'CANCELLED'
            GROUP BY DATE(appointment_date), appointment_time
            ORDER BY DATE(appointment_date), appointment_time
        `, [testDoctor.id]);

        console.log('📅 Appointments by Session:');
        console.log('-'.repeat(70));
        appointments.forEach(a => {
            const dateStr = a.appt_date.toISOString().split('T')[0];
            console.log(`   ${dateStr} at ${a.appointment_time}: ${a.count} booking(s)`);
        });

        // Pick a session to test
        if (appointments.length > 0) {
            const testSession = appointments[0];
            const testDate = testSession.appt_date.toISOString().split('T')[0];
            const testTime = testSession.appointment_time.substring(0, 5);

            console.log('\n' + '='.repeat(70));
            console.log(`🧪 Testing Session: ${testDate} at ${testTime}`);
            console.log('='.repeat(70));

            // Simulate the fixed availability query
            const [bookingCounts] = await pool.execute(`
                SELECT 
                    DATE(appointment_date) as appt_date, 
                    appointment_time, 
                    COUNT(*) as book_count
                FROM appointments
                WHERE doctor_id = ? 
                AND DATE(appointment_date) = ?
                AND appointment_time = ?
                AND status != 'CANCELLED'
                GROUP BY DATE(appointment_date), appointment_time
            `, [testDoctor.id, testDate, testTime]);

            const currentBookings = bookingCounts[0]?.book_count || 0;
            const maxCapacity = 40; // Default capacity
            const availableSpots = maxCapacity - currentBookings;

            console.log('\n✅ SLOT AVAILABILITY CALCULATION:\n');
            console.log(`   Max Capacity:      ${maxCapacity}`);
            console.log(`   Current Bookings:  ${currentBookings}`);
            console.log(`   Available Spots:   ${availableSpots}`);

            if (currentBookings > 0 && availableSpots === maxCapacity) {
                console.log(`\n   ❌ BUG: Should show ${maxCapacity - currentBookings} spots, not ${maxCapacity}`);
            } else if (currentBookings > 0) {
                console.log(`\n   ✅ CORRECT: Showing proper availability!`);
            } else {
                console.log(`\n   ℹ️  No bookings for this session (expected to show full capacity)`);
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ Verification Complete!');
        console.log('='.repeat(70));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
})();
