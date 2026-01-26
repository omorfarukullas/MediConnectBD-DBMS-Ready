
const pool = require('./config/db');

async function seedQueue() {
    try {
        console.log('--- Seeding Queue for Dr. Lynn Kihn (ID: 10014) ---');
        const doctorId = 10014;
        const today = '2026-01-27'; // FORCE CLIENT DATE

        // 1. Get a patient ID to attach
        const [patients] = await pool.execute('SELECT id FROM patients LIMIT 5');
        const patientId = patients[0].id; // Use first available patient

        console.log(`Creating appointments for Doctor ${doctorId} with Patient ${patientId} on ${today}`);

        // 2. Insert Appointment 1 (CONFIRMED)
        const [res1] = await pool.execute(`
            INSERT INTO appointments (doctor_id, patient_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit, created_at, updated_at)
            VALUES (?, ?, ?, '10:00:00', 'TELEMEDICINE', 'CONFIRMED', 'Headache and fever', NOW(), NOW())
        `, [doctorId, patientId, today]);

        // 3. Insert Queue Entry for Apt 1
        await pool.execute(`
            INSERT INTO appointment_queue (appointment_id, doctor_id, patient_id, queue_number, queue_date, status, created_at, updated_at)
            VALUES (?, ?, ?, 1, ?, 'WAITING', NOW(), NOW())
        `, [res1.insertId, doctorId, patientId, today]);

        console.log(`Created Appointment ${res1.insertId} (Queue #1)`);

        // 4. Insert Appointment 2 (CONFIRMED)
        const [res2] = await pool.execute(`
            INSERT INTO appointments (doctor_id, patient_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit, created_at, updated_at)
            VALUES (?, ?, ?, '10:30:00', 'PHYSICAL', 'CONFIRMED', 'General checkup', NOW(), NOW())
        `, [doctorId, patientId, today]);

        // 5. Insert Queue Entry for Apt 2
        await pool.execute(`
            INSERT INTO appointment_queue (appointment_id, doctor_id, patient_id, queue_number, queue_date, status, created_at, updated_at)
            VALUES (?, ?, ?, 2, ?, 'WAITING', NOW(), NOW())
        `, [res2.insertId, doctorId, patientId, today]);

        console.log(`Created Appointment ${res2.insertId} (Queue #2)`);

        console.log('✅ Seeding Complete. Please refresh the Doctor Portal.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

seedQueue();
