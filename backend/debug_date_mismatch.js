const pool = require('./config/db');

(async () => {
    try {
        const doctorId = 40013; // Dr. Brent Ortiz

        // Current date (Bangladesh time: 2026-01-24)
        const currentDate = new Date(); // 2026-01-24T13:50:00+06:00
        console.log('📅 Current Date (Bangladesh):', currentDate.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
        console.log('📅 Current Date (ISO String):', currentDate.toISOString());
        console.log('📅 Date String (used in query):', currentDate.toISOString().split('T')[0]);

        // Check what dates are actually stored
        const [appts] = await pool.execute(`
            SELECT 
                id,
                appointment_date,
                DATE(appointment_date) as date_only,
                appointment_time,
                status
            FROM appointments 
            WHERE doctor_id = ? AND status != 'CANCELLED'
            ORDER BY appointment_date
        `, [doctorId]);

        console.log('\n📋 Appointments in DB:');
        appts.forEach(a => {
            console.log(`  ID: ${a.id}, Date: ${a.appointment_date.toISOString()}, Date Only: ${a.date_only}, Time: ${a.appointment_time}`);
        });

        // Simulate the query from slotController using today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // "2026-01-24"
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0]; // "2026-01-25"

        console.log(`\n🔍 Querying for: ${todayStr} to ${tomorrowStr}`);

        const [bookingCounts] = await pool.execute(`
            SELECT 
                appointment_date, 
                appointment_time, 
                COUNT(*) as book_count
            FROM appointments
            WHERE doctor_id = ? 
            AND appointment_date BETWEEN ? AND ?
            AND status != 'CANCELLED'
            GROUP BY appointment_date, appointment_time
        `, [doctorId, todayStr, tomorrowStr]);

        console.log('\n📊 Booking Count Result:', JSON.stringify(bookingCounts, null, 2));

        // Try with DATE() function
        const [bookingCounts2] = await pool.execute(`
            SELECT 
                DATE(appointment_date) as appt_date, 
                appointment_time, 
                COUNT(*) as book_count
            FROM appointments
            WHERE doctor_id = ? 
            AND DATE(appointment_date) BETWEEN ? AND ?
            AND status != 'CANCELLED'
            GROUP BY DATE(appointment_date), appointment_time
        `, [doctorId, todayStr, tomorrowStr]);

        console.log('\n📊 Booking Count with DATE() function:', JSON.stringify(bookingCounts2, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
