const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const pool = require('../../config/db');

/**
 * Seed Users Table
 * Creates users for all 4 roles: PATIENT, DOCTOR, HOSPITAL_ADMIN, SUPER_ADMIN
 * All users will have password: password123
 */
async function seedUsers(counts = { patients: 50, doctors: 20, admins: 5, superAdmins: 2 }) {
    console.log('🌱 Seeding users...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = [];

    // Generate Patients
    for (let i = 0; i < counts.patients; i++) {
        users.push({
            email: faker.internet.email().toLowerCase(),
            password: hashedPassword,
            role: 'PATIENT',
            is_active: true,
            is_verified: faker.datatype.boolean(0.85) // 85% verified
        });
    }

    // Generate Doctors
    for (let i = 0; i < counts.doctors; i++) {
        users.push({
            email: faker.internet.email().toLowerCase(),
            password: hashedPassword,
            role: 'DOCTOR',
            is_active: true,
            is_verified: faker.datatype.boolean(0.95) // 95% verified
        });
    }

    // Generate Hospital Admins
    for (let i = 0; i < counts.admins; i++) {
        users.push({
            email: faker.internet.email().toLowerCase(),
            password: hashedPassword,
            role: 'HOSPITAL_ADMIN',
            is_active: true,
            is_verified: true
        });
    }

    // Generate Super Admins (first one has fixed email for easy login)
    for (let i = 0; i < counts.superAdmins; i++) {
        users.push({
            email: i === 0 ? 'superadmin@mediconnect.com' : faker.internet.email().toLowerCase(),
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            is_active: true,
            is_verified: true
        });
    }

    // Insert all users
    for (const user of users) {
        await pool.execute(
            'INSERT INTO users (email, password, role, is_active, is_verified) VALUES (?, ?, ?, ?, ?)',
            [user.email, user.password, user.role, user.is_active, user.is_verified]
        );
    }

    console.log(`✅ Created ${users.length} users`);
    console.log(`   📧 Super Admin: superadmin@mediconnect.com / password123`);
}

module.exports = seedUsers;
