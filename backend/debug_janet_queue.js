const pool = require('./config/db');

(async () => {
    try {
        const today = new Date().toISOString().split('T')[0];

        console.log(`\n🔍 DEBUGGING QUEUE FOR DR. JANET MACEJKOVIC\n`);
        console.log('='.repeat(70));

        // Find Dr. Janet's ID
        const [doctors] = await pool.execute(`
            SELECT id, full_name
            FROM doctors
            WHERE full_name LIKE '%Janet%'
        `);

        if (doctors.length === 0) {
            console.log('❌ Dr. Janet not found!');
            await pool.end();
            process.exit(1);
        }

        const doctor = doctors[0];
        console.log(`\n👨‍⚕️ Doctor Found: ${doctor.full_name} (ID: ${doctor.id})\n`);

        // Check appointments for this specific doctor today
        const [appointments] = await pool.execute(`
            SELECT 
                a.id,
                a.patient_id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                p.full_name as patient_name
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = ?
            AND DATE(a.appointment_date) = ?
            AND a.status != 'CANCELLED'
            ORDER BY a.appointment_time
        `, [doctor.id, today]);

        console.log(`📅 Appointments for ${doctor.full_name} on ${today}:`);
        console.log(`   Total: ${appointments.length}\n`);

        if (appointments.length === 0) {
            console.log('❌ NO APPOINTMENTS FOUND FOR THIS DOCTOR TODAY!\n');

            // Check if ANY appointments exist for today
            const [anyToday] = await pool.execute(`
                SELECT doctor_id, COUNT(*) as count
                FROM appointments
                WHERE DATE(appointment_date) = ?
                GROUP BY doctor_id
            `, [today]);

            console.log('📊 Appointments by doctor for today:');
            if (anyToday.length === 0) {
                console.log('   ❌ NO appointments exist for ANY doctor today!');
            } else {
                anyToday.forEach(row => {
                    console.log(`   Doctor ${row.doctor_id}: ${row.count} appointments`);
                });
            }

            console.log('\n💡 SOLUTION: Create appointments specifically for Dr. Janet (ID: ' + doctor.id + ')');
        } else {
            appointments.forEach(apt => {
                console.log(`   ✅ ${apt.appointment_time} - ${apt.patient_name} (${apt.status})`);
            });

            // Check queue entries
            const [queueEntries] = await pool.execute(`
                SELECT * FROM appointment_queue
                WHERE doctor_id = ? AND DATE(queue_date) = ?
            `, [doctor.id, today]);

            console.log(`\n🎫 Queue Entries: ${queueEntries.length}`);
        }

        console.log('\n' + '='.repeat(70));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
})();
