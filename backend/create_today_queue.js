const pool = require('./config/db');

/**
 * Create appointments for TODAY for multiple doctors
 * This ensures the queue dashboard has immediate data to display
 */
(async () => {
    try {
        const today = new Date().toISOString().split('T')[0];

        console.log(`\n📅 Creating TODAY's Appointments (${today})\n`);
        console.log('='.repeat(70));

        // Get first 5 doctors
        const [doctors] = await pool.execute('SELECT id, full_name FROM doctors ORDER BY id LIMIT 5');

        if (doctors.length === 0) {
            console.log('❌ No doctors found! Run masterSeed first.');
            await pool.end();
            process.exit(1);
        }

        // Get patients
        const [patients] = await pool.execute('SELECT id, full_name FROM patients ORDER BY id LIMIT 20');

        if (patients.length === 0) {
            console.log('❌ No patients found! Run masterSeed first.');
            await pool.end();
            process.exit(1);
        }

        console.log(`\n👨‍⚕️ Creating appointments for ${doctors.length} doctors...\n`);

        const times = ['09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '14:00:00', '14:30:00', '15:00:00'];
        let totalCreated = 0;

        for (const doctor of doctors) {
            console.log(`\n${doctor.full_name}:`);

            // Create 3-5 appointments per doctor for today
            const numAppointments = Math.floor(Math.random() * 3) + 3; // 3-5 appointments

            for (let i = 0; i < numAppointments; i++) {
                const patient = patients[Math.floor(Math.random() * patients.length)];
                const time = times[i % times.length];

                try {
                    // Create appointment
                    const [result] = await pool.execute(`
                        INSERT INTO appointments 
                        (patient_id, doctor_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit)
                        VALUES (?, ?, ?, ?, 'PHYSICAL', 'CONFIRMED', ?)
                    `, [patient.id, doctor.id, today, time, `Checkup for ${patient.full_name}`]);

                    // Create queue entry
                    await pool.execute(`
                        INSERT INTO appointment_queue 
                        (appointment_id, doctor_id, patient_id, queue_number, queue_date, status)
                        VALUES (?, ?, ?, ?, ?, 'WAITING')
                    `, [result.insertId, doctor.id, patient.id, i + 1, today]);

                    console.log(`   ✅ ${time} - ${patient.full_name} (Queue #${i + 1})`);
                    totalCreated++;
                } catch (err) {
                    // Skip duplicates
                    if (!err.message.includes('Duplicate')) {
                        console.log(`   ⚠️  Error creating appointment: ${err.message}`);
                    }
                }
            }
        }

        console.log(`\n✅ Created ${totalCreated} appointments for TODAY!`);
        console.log(`\n📊 Doctors can now test the Live Queue with real data.\n`);
        console.log('='.repeat(70));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
        process.exit(1);
    }
})();
