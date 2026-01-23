const pool = require('../../config/db');
const seedUsers = require('./seedUsers');
const seedHospitals = require('./seedHospitals');
const seedDoctors = require('./seedDoctors');
const seedPatients = require('./seedPatients');
const seedAppointments = require('./seedAppointments');
const seedMedicalRecords = require('./seedMedicalRecords');
const seedReviews = require('./seedReviews');
const seedDoctorSlots = require('./seedDoctorSlots');

/**
 * Master Seeder - Runs all seeders in correct order
 * This script populates the database with realistic test data using Faker.js
 */
async function masterSeed() {
    console.log('🚀 Starting MediConnect BD Database Seeding...\n');
    console.log('='.repeat(60));

    try {
        // Test database connection
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully\n');
        connection.release();

        // Seed in correct order (respecting foreign key dependencies)
        console.log('Phase 1: Core Users');
        console.log('-'.repeat(60));
        await seedUsers({ patients: 100, doctors: 30, admins: 10, superAdmins: 2 });
        console.log('');

        console.log('Phase 2: Hospital Infrastructure');
        console.log('-'.repeat(60));
        const hospitalIds = await seedHospitals(15);
        console.log('');

        console.log('Phase 3: Doctor Profiles');
        console.log('-'.repeat(60));
        await seedDoctors(hospitalIds);
        console.log('');

        console.log('Phase 4: Patient Profiles');
        console.log('-'.repeat(60));
        await seedPatients();
        console.log('');

        console.log('Phase 5: Doctor Slots');
        console.log('-'.repeat(60));
        const slotCount = await seedDoctorSlots();
        console.log('');

        console.log('Phase 6: Appointments & Queue');
        console.log('-'.repeat(60));
        const appointmentIds = await seedAppointments();
        console.log('');

        console.log('Phase 7: Medical Records');
        console.log('-'.repeat(60));
        await seedMedicalRecords();
        console.log('');

        console.log('Phase 8: Reviews & Feedback');
        console.log('-'.repeat(60));
        await seedReviews(appointmentIds);
        console.log('');

        console.log('='.repeat(60));
        console.log('✅ Database seeding completed successfully!\n');

        // Display summary statistics
        console.log('📊 Database Summary:');
        console.log('-'.repeat(60));

        const tables = [
            'users', 'patients', 'doctors', 'hospital_admins', 'super_admins',
            'hospitals', 'hospital_resources', 'departments', 'tests', 'ambulances',
            'appointments', 'appointment_queue', 'doctor_slots',
            'medical_documents', 'prescriptions', 'doctor_earnings', 'reviews'
        ];

        for (const table of tables) {
            const [result] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`   ${table.padEnd(25)} :  ${result[0].count}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🔑 Test Login Credentials:');
        console.log('-'.repeat(60));
        console.log('   Super Admin:');
        console.log('   Email    : superadmin@mediconnect.com');
        console.log('   Password : password123');
        console.log('');
        console.log('   Note: All users have password "password123"');
        console.log('='.repeat(60) + '\n');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        console.error('Stack trace:', error.stack);
        await pool.end();
        process.exit(1);
    }
}

// Run master seeder
masterSeed();
