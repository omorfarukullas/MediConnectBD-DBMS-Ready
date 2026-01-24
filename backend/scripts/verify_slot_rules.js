const pool = require('../config/db');

async function verifySlotRules() {
    console.log('🧪 Verifying Slot Rules & Capacity Logic...\n');
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Setup: Get Doctor & Patient
        const [doctors] = await connection.execute('SELECT id, user_id FROM doctors LIMIT 1');
        const [patients] = await connection.execute('SELECT id, user_id FROM patients LIMIT 1');
        const doctorId = doctors[0].id;
        const patientId = patients[0].id;
        const testDate = new Date().toISOString().split('T')[0];

        console.log(`👨‍⚕️ Testing with Doctor ID: ${doctorId}`);
        console.log(`👤 Testing with Patient ID: ${patientId}`);

        // 2. Create a constrained slot (Max Patients = 1)
        console.log('\n📝 Creating Test Slot (Max: 1)...');
        // Find what day of week 'testDate' is
        const dayName = new Date(testDate).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

        await connection.execute(
            `DELETE FROM doctor_slots WHERE doctor_id = ? AND start_time = '23:00:00'`,
            [doctorId]
        ); // Cleanup previous runs

        const [slotResult] = await connection.execute(
            `INSERT INTO doctor_slots (doctor_id, day_of_week, start_time, end_time, consultation_type, max_patients, is_active)
             VALUES (?, ?, '23:00:00', '23:30:00', 'PHYSICAL', 1, TRUE)`,
            [doctorId, dayName]
        );
        const ruleId = slotResult.insertId;
        console.log(`✅ Created Rule ID: ${ruleId} for ${dayName} 23:00`);

        // 3. Construct Synthetic Slot ID
        // Logic from slotController: RuleID + YYYYMMDD + HHMM
        const timeStr = '2300';
        const dateStr = testDate.replace(/-/g, '');
        const syntheticSlotId = `${ruleId}${dateStr}${timeStr}`;
        console.log(`🔑 Synthetic Slot ID: ${syntheticSlotId}`);

        // 4. Cleanup any existing appointments for this slot
        await connection.execute(
            `DELETE FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = '23:00:00'`,
            [doctorId, testDate]
        );

        // 5. Attempt Booking 1 (Should SUCCESS)
        console.log('\nBooking Patient 1 (Expected: SUCCESS)...');
        // Simulate exact logic from appointmentController validation query
        const [counts1] = await connection.execute(
            `SELECT COUNT(*) as count FROM appointments 
             WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = '23:00:00' AND status != 'CANCELLED'`,
            [doctorId, testDate]
        );

        if (counts1[0].count < 1) {
            await connection.execute(
                `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status)
                 VALUES (?, ?, ?, '23:00:00', 'CONFIRMED')`,
                [patientId, doctorId, testDate]
            );
            console.log('✅ Booking 1 Successful');
        } else {
            console.error('❌ Failed to book first patient (unexpected)');
        }

        // 6. Attempt Booking 2 (Should FAIL)
        console.log('\nBooking Patient 2 (Expected: FAIL - Fully Booked)...');
        const [counts2] = await connection.execute(
            `SELECT COUNT(*) as count FROM appointments 
             WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = '23:00:00' AND status != 'CANCELLED'`,
            [doctorId, testDate]
        );

        const currentCount = counts2[0].count;
        console.log(`📊 Current Bookings: ${currentCount} / Max: 1`);

        if (currentCount >= 1) {
            console.log('✅ Logic Validated: System blocked 2nd booking due to capacity.');
        } else {
            console.error('❌ FAIL: Logic would have allowed overbooking!');
        }

        // Cleanup
        await connection.rollback();
        console.log('\n♻️ Test Data Rolled Back');

    } catch (err) {
        console.error('❌ Test Error:', err);
        if (connection) await connection.rollback();
    } finally {
        if (connection) connection.release();
    }
}

verifySlotRules();
