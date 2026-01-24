const pool = require('../config/db');

async function testFullFlow() {
    console.log('🚀 Starting End-to-End Flow Test...\n');
    const connection = await pool.getConnection();

    try {
        // 1. Setup Data - Find a doctor and a patient
        const [doctors] = await connection.execute('SELECT id, full_name, user_id FROM doctors LIMIT 1');
        const [patients] = await connection.execute('SELECT id, user_id, full_name FROM patients LIMIT 1');

        if (doctors.length === 0 || patients.length === 0) {
            throw new Error('❌ Need at least 1 doctor and 1 patient in DB to run test');
        }

        const doctor = doctors[0];
        const patient = patients[0];
        const date = new Date().toISOString().split('T')[0];
        console.log(`👨‍⚕️ Doctor: ${doctor.full_name} (ID: ${doctor.id})`);
        console.log(`👤 Patient: ${patient.full_name} (ID: ${patient.id})`);

        // 2. Simulate Booking (Direct SQL for speed, mimicking controller logic)
        console.log('\n===== STEP 1: Booking Appointment (CONFIRMED) =====');

        // Check for existing appointment today to avoid dupes (optional in test logic but good practice)
        await connection.execute(
            'DELETE FROM appointment_queue WHERE patient_id = ? AND queue_date = ?',
            [patient.id, date]
        );
        await connection.execute(
            'DELETE FROM appointments WHERE patient_id = ? AND appointment_date = ?',
            [patient.id, date]
        );

        // Insert Appointment
        const [apptResult] = await connection.execute(
            `INSERT INTO appointments 
             (patient_id, doctor_id, consultation_type, appointment_date, appointment_time, status, reason_for_visit, created_at, updated_at)
             VALUES (?, ?, 'PHYSICAL', ?, '10:00:00', 'CONFIRMED', 'E2E Test', NOW(), NOW())`,
            [patient.id, doctor.id, date]
        );
        const appointmentId = apptResult.insertId;

        // Insert Queue Entry
        const [queueResult] = await connection.execute(
            `INSERT INTO appointment_queue 
             (appointment_id, queue_number, patient_id, doctor_id, queue_date, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'waiting', NOW(), NOW())`,
            [appointmentId, 999, patient.id, doctor.id, date]
        );

        console.log(`✅ Booked Appointment ID: ${appointmentId}`);
        console.log(`✅ Assigned Queue #: 999`);

        // 3. Test Patient Tracking (getMyPosition logic)
        console.log('\n===== STEP 2: Patient Checking Status =====');
        const [myPos] = await connection.execute(
            `SELECT a.status, aq.queue_number 
             FROM appointments a
             JOIN appointment_queue aq ON a.id = aq.appointment_id
             WHERE a.id = ? AND a.status IN ('PENDING', 'IN_PROGRESS', 'CONFIRMED')`,
            [appointmentId]
        );

        if (myPos.length > 0) {
            console.log(`✅ Patient retrieved status: ${myPos[0].status}`);
            console.log(`✅ Patient queue number: ${myPos[0].queue_number}`);
        } else {
            console.error('❌ Patient could not find their appointment! (Check status filter)');
        }

        // 4. Test Doctor Dashboard (getTodayQueue logic)
        console.log('\n===== STEP 3: Doctor Dashboard View =====');
        const [queueList] = await connection.execute(
            `SELECT id, status, patient_id 
             FROM appointments 
             WHERE doctor_id = ? AND appointment_date = ? AND status IN ('PENDING', 'CONFIRMED')`,
            [doctor.id, date]
        );

        const found = queueList.find(a => a.id === appointmentId);
        if (found) {
            console.log(`✅ New appointment found in Doctor's list`);
            console.log(`✅ Status shown to doctor: ${found.status}`);
        } else {
            console.error('❌ Appointment missing from Doctor Dashboard! (Check status filter)');
        }

        // 5. Test Call Next Patient (callNextPatient logic)
        console.log('\n===== STEP 4: Doctor Calling Next Patient =====');
        // We'll verify if our query picks it up. We assume 999 is the only one or we filter by ID for test
        const [nextPatient] = await connection.execute(
            `SELECT a.id, a.status 
             FROM appointments a
             LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
             WHERE a.doctor_id = ? 
             AND a.appointment_date = ? 
             AND a.status IN ('PENDING', 'CONFIRMED')
             AND a.id = ?
             LIMIT 1`,
            [doctor.id, date, appointmentId]
        );

        if (nextPatient.length > 0) {
            console.log(`✅ Doctor can see this patient to CALL NEXT`);
        } else {
            console.error('❌ Doctor call logic ignored this patient!');
        }

    } catch (err) {
        console.error('❌ Test Failed:', err);
    } finally {
        await connection.end();
        console.log('\n🏁 Test Completed');
    }
}

testFullFlow();
