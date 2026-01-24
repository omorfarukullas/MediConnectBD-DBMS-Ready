const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');

/**
 * Seed Hospital Admins
 */
async function seedHospitalAdmins() {
    console.log('🌱 Seeding hospital admins...');

    // Get all users with role HOSPITAL_ADMIN
    const [users] = await pool.execute('SELECT id, email FROM users WHERE role = "HOSPITAL_ADMIN"');

    if (users.length === 0) {
        console.log('⚠️ No hospital admin users found. Skipping admin profile creation.');
        return;
    }

    // Get all hospitals
    const [hospitals] = await pool.execute('SELECT id, name FROM hospitals');

    if (hospitals.length === 0) {
        console.log('⚠️ No hospitals found. Cannot assign admins.');
        return;
    }

    const admins = [];

    // Assign each user to a hospital
    // We'll loop through users and assign them to hospitals sequentially
    for (let i = 0; i < users.length; i++) {
        // If we have more admins than hospitals, cycle through hospitals or just stop
        // Ideally 1 admin per hospital for this test
        if (i >= hospitals.length) break;

        const user = users[i];
        const hospital = hospitals[i];

        admins.push({
            user_id: user.id,
            hospital_id: hospital.id,
            full_name: faker.person.fullName(),
            phone: faker.phone.number(),
            designation: 'Hospital Administrator'
        });
    }

    // Insert into hospital_admins table
    for (const admin of admins) {
        await pool.execute(
            `INSERT INTO hospital_admins (user_id, hospital_id, full_name, phone, designation)
             VALUES (?, ?, ?, ?, ?)`,
            [admin.user_id, admin.hospital_id, admin.full_name, admin.phone, admin.designation]
        );
    }

    console.log(`✅ Created ${admins.length} hospital admin profiles`);
}

module.exports = seedHospitalAdmins;
