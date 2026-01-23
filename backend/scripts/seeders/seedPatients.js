const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');

/**
 * Seed Patients Table
 * Creates patient profiles for all users with PATIENT role
 */
async function seedPatients() {
    console.log('🌱 Seeding patients...');

    // Get all users with PATIENT role
    const [users] = await pool.execute(
        'SELECT id FROM users WHERE role = "PATIENT"'
    );

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    for (const user of users) {
        const patient = {
            user_id: user.id,
            full_name: faker.person.fullName(),
            phone: '+880' + faker.string.numeric(10),
            address: faker.location.streetAddress({ useFullAddress: true }) + ', ' +
                faker.location.city() + ', Bangladesh',
            date_of_birth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
            blood_group: faker.helpers.arrayElement(bloodGroups),
            weight: faker.number.float({ min: 45, max: 120, fractionDigits: 1 }),
            height: faker.number.float({ min: 150, max: 190, fractionDigits: 1 })
        };

        await pool.execute(
            `INSERT INTO patients (user_id, full_name, phone, address, date_of_birth, blood_group, weight, height)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [patient.user_id, patient.full_name, patient.phone, patient.address,
            patient.date_of_birth, patient.blood_group, patient.weight, patient.height]
        );
    }

    console.log(`✅ Created ${users.length} patient profiles`);
}

module.exports = seedPatients;
