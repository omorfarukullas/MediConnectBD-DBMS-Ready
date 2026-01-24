const pool = require('./config/db');

/**
 * Create appointments specifically for Dr. Janet Macejkovic for TODAY
 */
(async () => {
    try {
        const today = new Date().toISOString().split('T')[0];

        console.log(`\n📅 Creating Appointments for Dr. Janet TODAY (${today})\n`);
        console.log('='.repeat(70));

        // Find Dr. Janet
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
        console.log(`\n👨‍⚕️ Doctor: ${doctor.full_name} (ID: ${doctor.id})\n`);

        // Get patients
        const [patients] = await pool.execute('SELECT id, full_name FROM patients LIMIT 10');

        if (patients.length === 0) {
            console.log('❌ No patients found!');
            await pool.end();
            process.exit(1);
        }

        console.log(`📋 Creating appointments...\n`);

        const times = ['09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00', '14:00:00', '14:30:00', '15:00:00'];
        let created = 0;

        for (let i = 0; i < Math.min(8, patients.length); i++) {
            const patient = patients[i];
            const time = times[i];

            // Create appointment
            const [result] = await pool.execute(`
                INSERT INTO appointments 
                (patient_id, doctor_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit)
                VALUES (?, ?, ?, ?, 'PHYSICAL', 'CONFIRMED', ?)
            `, [patient.id, doctor.id, today, time, `General checkup for ${patient.full_name}`]);

            // Create queue entry
            await pool.execute(`
                INSERT INTO appointment_queue 
                (appointment_id, doctor_id, patient_id, queue_number, queue_date, status)
                VALUES (?, ?, ?, ?, ?, 'WAITING')
            `, [result.insertId, doctor.id, patient.id, i + 1, today]);

            console.log(`✅ ${time} - ${patient.full_name} (Queue #${i + 1})`);
            created++;
        }

        console.log(`\n✅ Successfully created ${created} appointments for ${doctor.full_name}!`);
        console.log(`\n📊 Refresh the Doctor Portal to see the queue.\n`);
        console.log('='.repeat(70));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        console.error(error.stack);
        await pool.end();
        process.exit(1);
    }
})();
