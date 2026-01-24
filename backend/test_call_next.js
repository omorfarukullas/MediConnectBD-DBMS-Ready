const pool = require('./config/db');

/**
 * Test the callNextPatient logic
 */
(async () => {
    try {
        const today = new Date().toISOString().split('T')[0];

        console.log('\n🧪 TESTING CALL NEXT PATIENT LOGIC\n');
        console.log('='.repeat(70));

        // Find Dr. Janet
        const [doctors] = await pool.execute(`
            SELECT id FROM doctors WHERE full_name LIKE '%Janet%'
        `);

        if (doctors.length === 0) {
            console.log('❌ Dr. Janet not found');
            await pool.end();
            process.exit(1);
        }

        const doctorId = doctors[0].id;
        console.log(`\n👨‍⚕️ Testing for Doctor ID: ${doctorId}\n`);

        // Simulate the callNextPatient query
        const [nextPatients] = await pool.execute(`
            SELECT 
                a.id,
                a.patient_id,
                p.full_name as patient_name,
                aq.queue_number
            FROM appointments a
            LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
            LEFT JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = ?
            AND a.appointment_date = ?
            AND a.status IN ('PENDING', 'CONFIRMED')
            ORDER BY aq.queue_number ASC, a.appointment_time ASC
            LIMIT 1
        `, [doctorId, today]);

        console.log('📋 Query for next patient:');
        console.log(`   Found: ${nextPatients.length} patient(s)\n`);

        if (nextPatients.length === 0) {
            console.log('❌ NO PENDING/CONFIRMED APPOINTMENTS FOUND!');
            console.log('\n   Possible reasons:');
            console.log('   - All appointments are IN_PROGRESS or COMPLETED');
            console.log('   - No queue_number set in appointment_queue table');
            console.log('   - Appointments not in PENDING or CONFIRMED status\n');

            // Check actual statuses
            const [allAppointments] = await pool.execute(`
                SELECT status, COUNT(*) as count
                FROM appointments
                WHERE doctor_id = ? AND DATE(appointment_date) = ?
                GROUP BY status
            `, [doctorId, today]);

            console.log('📊 Appointment statuses for today:');
            allAppointments.forEach(a => {
                console.log(`   ${a.status}: ${a.count}`);
            });

            // Check queue entries
            const [queueCheck] = await pool.execute(`
                SELECT a.id, a.status, aq.queue_number
                FROM appointments a
                LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
                WHERE a.doctor_id = ? AND DATE(a.appointment_date) = ?
                LIMIT 5
            `, [doctorId, today]);

            console.log('\n📋 Sample appointments with queue numbers:');
            queueCheck.forEach(a => {
                console.log(`   Appt ${a.id}: Status=${a.status}, Queue=${a.queue_number || 'NULL'}`);
            });

        } else {
            const next = nextPatients[0];
            console.log('✅ NEXT PATIENT FOUND:');
            console.log(`   Appointment ID: ${next.id}`);
            console.log(`   Patient: ${next.patient_name}`);
            console.log(`   Queue Number: ${next.queue_number || 'NULL'}`);
            console.log('\n   The "Call Next Patient" should work!');
        }

        console.log('\n' + '='.repeat(70));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
})();
