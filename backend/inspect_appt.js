const pool = require('./config/db');

(async () => {
    try {
        // Check the appointment that was made for Jan 24
        const [appt] = await pool.execute(`
            SELECT 
                id,
                patient_id,
                doctor_id,
                appointment_date,
                appointment_time,
                consultation_type,
                status,
                created_at
            FROM appointments 
            WHERE id = 100161
        `, []);

        console.log('🔍 Appointment Details (ID 100161):');
        console.log(JSON.stringify(appt[0], null, 2));
        console.log('\n📅 Breakdown:');
        console.log('  appointment_date (raw):', appt[0].appointment_date);
        console.log('  appointment_date (ISO):', appt[0].appointment_date.toISOString());
        console.log('  appointment_date (DATE only):', appt[0].appointment_date.toISOString().split('T')[0]);
        console.log('  appointment_time:', appt[0].appointment_time);
        console.log('  created_at (Bangladesh time):', appt[0].created_at.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));

        // What date was this supposed to be?
        console.log('\n🤔 Analysis:');
        console.log('  This was likely booked for TODAY (2026-01-24) at 09:00 AM Bangladesh time');
        console.log('  But it was saved as: 2026-01-23 (UTC date)');
        console.log('  This causes mismatch in slot availability calculations');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
