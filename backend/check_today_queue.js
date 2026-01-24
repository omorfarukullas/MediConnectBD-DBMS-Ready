const pool = require('./config/db');

(async () => {
    try {
        const today = new Date().toISOString().split('T')[0];

        console.log(`\n🔍 Checking Queue Data for Today (${today})\n`);
        console.log('='.repeat(60));

        // Check appointments for today
        const [todayAppointments] = await pool.execute(`
            SELECT 
                a.id,
                a.doctor_id,
                a.patient_id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                d.full_name as doctor_name
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            WHERE DATE(a.appointment_date) = ?
            AND a.status != 'CANCELLED'
            ORDER BY a.doctor_id, a.appointment_time
        `, [today]);

        console.log(`\n📅 Total Appointments Today: ${todayAppointments.length}\n`);

        if (todayAppointments.length === 0) {
            console.log('❌ NO APPOINTMENTS FOR TODAY!');
            console.log('\nThis is why the queue dashboard shows no data.');
            console.log('\n💡 Solution: Seed appointments with today\'s date or test with a date that has appointments.\n');

            // Show dates that DO have appointments
            const [dates] = await pool.execute(`
                SELECT 
                    DATE(appointment_date) as date,
                    COUNT(*) as count
                FROM appointments
                WHERE status != 'CANCELLED'
                GROUP BY DATE(appointment_date)
                ORDER BY appointment_date
                LIMIT 10
            `);

            console.log('📊 Dates with appointments:');
            dates.forEach(d => {
                const dateStr = d.date.toISOString().split('T')[0];
                console.log(`   ${dateStr}: ${d.count} appointments`);
            });
        } else {
            console.log('Appointments grouped by doctor:\n');

            const doctors = [...new Set(todayAppointments.map(a => a.doctor_id))];
            doctors.forEach(doctorId => {
                const doctorAppts = todayAppointments.filter(a => a.doctor_id === doctorId);
                console.log(`${doctorAppts[0].doctor_name}:`);
                doctorAppts.forEach(a => {
                    console.log(`   ${a.appointment_time} - ${a.status}`);
                });
                console.log('');
            });
        }

        console.log('='.repeat(60));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        await pool.end();
        process.exit(1);
    }
})();
