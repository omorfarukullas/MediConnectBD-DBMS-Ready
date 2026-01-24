const pool = require('./config/db');

(async () => {
    try {
        // Find Dr. Brent Ortiz
        const [doctors] = await pool.execute(`
            SELECT id, full_name, specialization 
            FROM doctors 
            WHERE full_name LIKE '%Brent%'
        `);
        console.log('\n📋 Doctors:', JSON.stringify(doctors, null, 2));

        if (doctors.length > 0) {
            const doctorId = doctors[0].id;

            // Get slots
            const [slots] = await pool.execute(`
                SELECT * FROM doctor_slots WHERE doctor_id = ?
            `, [doctorId]);
            console.log('\n🕒 Slots for Dr. Brent:', JSON.stringify(slots, null, 2));

            // Get appointments
            const [appts] = await pool.execute(`
                SELECT 
                    id,
                    patient_id,
                    doctor_id,
                    appointment_date,
                    appointment_time,
                    consultation_type,
                    status,
                    created_at
                FROM appointments 
                WHERE doctor_id = ? AND status != 'CANCELLED'
                ORDER BY appointment_date, appointment_time
            `, [doctorId]);
            console.log('\n📅 Appointments for Dr. Brent:', JSON.stringify(appts, null, 2));

            // Statistics
            console.log('\n📊 Summary:');
            console.log(`Total Slots: ${slots.length}`);
            console.log(`Total Appointments: ${appts.length}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
