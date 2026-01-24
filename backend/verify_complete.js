const pool = require('./config/db');

(async () => {
    try {
        console.log('\n📊 COMPREHENSIVE DATA VERIFICATION\n');
        console.log('='.repeat(70));

        // Basic counts
        const [counts] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM patients) as patients,
                (SELECT COUNT(*) FROM doctors) as doctors,
                (SELECT COUNT(*) FROM appointments) as appointments,
                (SELECT COUNT(*) FROM doctor_slots) as slots,
                (SELECT COUNT(*) FROM appointment_queue) as queue_entries,
                (SELECT COUNT(*) FROM reviews) as reviews
        `);

        const data = counts[0];
        console.log('📋 Database Summary:\n');
        console.log(`   Users: ${data.users}`);
        console.log(`   Patients: ${data.patients}`);
        console.log(`   Doctors: ${data.doctors}`);
        console.log(`   Appointments: ${data.appointments}`);
        console.log(`   Doctor Slots: ${data.slots}`);
        console.log(`   Queue Entries: ${data.queue_entries}`);
        console.log(`   Reviews: ${data.reviews}`);

        // Check patients with appointments
        const [patientStats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT p.id) as patients_with_appointments,
                (SELECT COUNT(*) FROM patients) as total_patients
            FROM patients p
            JOIN appointments a ON p.id = a.patient_id
        `);

        const pStats = patientStats[0];
        const coverage = ((pStats.patients_with_appointments / pStats.total_patients) * 100).toFixed(1);

        console.log(`\n👥 Patient Coverage:`);
        console.log(`   Patients with appointments: ${pStats.patients_with_appointments}/${pStats.total_patients} (${coverage}%)`);

        if (coverage < 100) {
            console.log(`   ⚠️  Not all patients have appointments!`);
        } else {
            console.log(`   ✅ ALL patients have appointments!`);
        }

        // Appointments per patient distribution
        const [distribution] = await pool.execute(`
            SELECT 
                COUNT(*) as appointment_count,
                COUNT(DISTINCT patient_id) as patient_count
            FROM (
                SELECT patient_id, COUNT(*) as count
                FROM appointments
                GROUP BY patient_id
            ) as counts
            GROUP BY appointment_count
            ORDER BY appointment_count
        `);

        console.log(`\n📊 Appointments per patient:`);
        distribution.forEach(d => {
            console.log(`   ${d.appointment_count} appointment(s): ${d.patient_count} patients`);
        });

        // Today's appointments
        const today = new Date().toISOString().split('T')[0];
        const [todayAppts] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM appointments
            WHERE DATE(appointment_date) = ?
        `, [today]);

        console.log(`\n📅 Appointments for TODAY (${today}): ${todayAppts[0].count}`);

        if (todayAppts[0].count > 0) {
            console.log(`   ✅ Queue ready for testing!`);
        } else {
            console.log(`   ⚠️  No appointments for today - queue will be empty`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ Database seeding verification complete!');
        console.log('='.repeat(70) + '\n');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
})();
