const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');

/**
 * Seed Super Admins
 */
async function seedSuperAdmins() {
    console.log('🌱 Seeding super admins...');

    // Get all users with role SUPER_ADMIN
    const [users] = await pool.execute('SELECT id, email FROM users WHERE role = "SUPER_ADMIN"');

    if (users.length === 0) {
        console.log('⚠️ No super admin users found. Skipping profile creation.');
        return;
    }

    const admins = [];

    for (const user of users) {
        admins.push({
            user_id: user.id,
            full_name: 'System Administrator', // Fixed name for main admin
            phone: faker.phone.number()
        });
    }

    // Insert into super_admins table
    for (const admin of admins) {
        await pool.execute(
            `INSERT INTO super_admins (user_id, full_name, phone)
             VALUES (?, ?, ?)`,
            [admin.user_id, admin.full_name, admin.phone]
        );
    }

    console.log(`✅ Created ${admins.length} super admin profiles`);
}

module.exports = seedSuperAdmins;
