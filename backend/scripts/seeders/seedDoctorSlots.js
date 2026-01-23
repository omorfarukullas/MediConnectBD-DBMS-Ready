const pool = require('../../config/db');
const { faker } = require('@faker-js/faker');

async function seedDoctorSlots() {
    console.log('🗓️  Seeding doctor slots (Session Blocks)...');

    try {
        // Get all doctors
        const [doctors] = await pool.execute('SELECT id FROM doctors');
        console.log(`   Found ${doctors.length} doctors`);

        if (doctors.length === 0) {
            console.log('   ⚠️  No doctors found. Skipping slot seeding.');
            return;
        }

        const workingDays = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
        const slots = [];

        for (const doctor of doctors) {
            // Doctors work 4-6 days a week
            const doctorDays = faker.helpers.arrayElements(workingDays, { min: 4, max: 6 });

            for (const day of doctorDays) {
                // Morning Session: 09:00 - 14:00 (5 hours)
                slots.push([
                    doctor.id,
                    day,
                    '09:00:00',
                    '14:00:00',
                    faker.helpers.arrayElement(['PHYSICAL', 'BOTH']),
                    15, // Avg duration (informational)
                    40, // Max 40 patients
                    true
                ]);

                // Evening Session: 17:00 - 21:00 (4 hours) - Not every day
                if (faker.datatype.boolean(0.7)) { // 70% chance of evening shift
                    slots.push([
                        doctor.id,
                        day,
                        '17:00:00',
                        '21:00:00',
                        faker.helpers.arrayElement(['PHYSICAL', 'TELEMEDICINE', 'BOTH']),
                        15, // Avg duration
                        30, // Max 30 patients
                        true
                    ]);
                }
            }
        }

        if (slots.length > 0) {
            const query = `
                INSERT INTO doctor_slots 
                (doctor_id, day_of_week, start_time, end_time, consultation_type, slot_duration_minutes, max_patients, is_active)
                VALUES ?
            `;
            await pool.query(query, [slots]);
            console.log(`   ✅ Created ${slots.length} doctor session blocks`);
        }

        return slots.length;
    } catch (error) {
        console.error('   ❌ Error seeding doctor slots:', error);
        throw error;
    }
}

module.exports = seedDoctorSlots;
