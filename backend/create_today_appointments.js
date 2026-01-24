const pool = require('./config/db');

/**
 * Create a few appointments for TODAY to test the queue functionality
 */
(async () => {
    try {
        const today = new Date().toISOString().split('T')[0];

        console.log(`\n📅 Creating Test Appointments for Today (${today})\n`);
        console.log('='.repeat(60));

        // Get a few doctors and patients
        const [doctors] = await pool.execute('SELECT id FROM doctors LIMIT 3');
        const [patients] = await pool.execute('SELECT id FROM patients LIMIT 10');

        if (doctors.length === 0 || patients.length === 0) {
            console.log('❌ No doctors or patients found! Run masterSeed first.');
            await pool.end();
            process.exit(1);
        }

        console.log(`\nFound ${doctors.length} doctors and ${patients.length} patients`);
        console.log('\nCreating appointments...\n');

        let created = 0;
        const times = ['09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00'];

        for (let i = 0; i < Math.min(8, patients.length); i++) {
            const doctor = doctors[i % doctors.length];
            const patient = patients[i];
            const time = times[i % times.length];

            const [result] = await pool.execute(`
                INSERT INTO appointments 
                (patient_id, doctor_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit)
                VALUES (?, ?, ?, ?, 'PHYSICAL', 'CONFIRMED', 'General checkup - Test appointment')
            `, [patient.id, doctor.id, today, time]);

            // Create queue entry
            await pool.execute(`
                INSERT INTO appointment_queue 
                (appointment_id, doctor_id, patient_id, queue_number, queue_date, status)
                VALUES (?, ?, ?, ?, ?, 'WAITING')
            `, [result.insertId, doctor.id, patient.id, i + 1, today]);

            console.log(`✅ Created appointment ${i + 1}: Doctor ${doctor.id}, Time ${time}, Queue #${i + 1}`);
            created++;
        }

        console.log(`\n✅ Successfully created ${created} appointments for today!`);
        console.log('\n📊 You can now test the queue dashboard with live data.\n');
        console.log('='.repeat(60));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
})();
