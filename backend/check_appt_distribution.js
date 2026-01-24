const pool = require('./config/db');

(async () => {
    try {
        console.log('\n🔍 APPOINTMENT DISTRIBUTION ANALYSIS\n');
        console.log('='.repeat(70));

        // Count appointments per doctor
        const [doctorCounts] = await pool.execute(`
            SELECT 
                d.id,
                d.full_name,
                COUNT(a.id) as appointment_count,
                GROUP_CONCAT(DISTINCT a.status) as statuses
            FROM doctors d
            LEFT JOIN appointments a ON d.id = a.doctor_id
            GROUP BY d.id, d.full_name
            ORDER BY appointment_count DESC
        `);

        console.log('📊 Appointments per Doctor:\n');

        let totalAppointments = 0;
        let doctorsWithOneAppt = 0;
        let doctorsWithMultiple = 0;
        let doctorsWithZero = 0;

        doctorCounts.forEach(doc => {
            const count = doc.appointment_count;
            totalAppointments += count;

            if (count === 0) doctorsWithZero++;
            else if (count === 1) doctorsWithOneAppt++;
            else doctorsWithMultiple++;

            const bar = '█'.repeat(Math.min(count, 20)) + '░'.repeat(Math.max(0, 20 - count));
            console.log(`${doc.full_name.padEnd(35)} [${bar}] ${count} appointments`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('📈 DISTRIBUTION SUMMARY:\n');
        console.log(`   Total Doctors: ${doctorCounts.length}`);
        console.log(`   Doctors with 0 appointments: ${doctorsWithZero}`);
        console.log(`   Doctors with 1 appointment: ${doctorsWithOneAppt}`);
        console.log(`   Doctors with 2+ appointments: ${doctorsWithMultiple}`);
        console.log(`   Total Appointments: ${totalAppointments}`);

        // Check if the issue is all doctors have exactly 1
        if (doctorsWithOneAppt === doctorCounts.length) {
            console.log('\n❌ PROBLEM DETECTED: Every doctor has exactly 1 appointment!');
            console.log('   This suggests the seeding logic has an issue.\n');

            // Sample a few appointments to see the pattern
            const [sampleAppts] = await pool.execute(`
                SELECT 
                    a.id,
                    a.doctor_id,
                    a.patient_id,
                    a.appointment_date,
                    a.appointment_time,
                    a.status,
                    d.full_name as doctor_name,
                    p.full_name as patient_name
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                JOIN patients p ON a.patient_id = p.id
                ORDER BY a.doctor_id
                LIMIT 10
            `);

            console.log('📋 Sample Appointments:\n');
            sampleAppts.forEach(a => {
                console.log(`   Dr: ${a.doctor_name} | Patient: ${a.patient_name} | ${a.appointment_date.toISOString().split('T')[0]} ${a.appointment_time}`);
            });
        } else if (doctorsWithOneAppt > doctorsWithMultiple * 2) {
            console.log('\n⚠️  Most doctors have only 1 appointment - distribution is very sparse');
        } else {
            console.log('\n✅ Appointment distribution looks varied');
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
