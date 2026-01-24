const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');
const fs = require('fs');
const path = require('path');

// Import existing modular seeders
const seedUsers = require('./seedUsers');
const seedHospitals = require('./seedHospitals');
const seedDoctors = require('./seedDoctors');
const seedPatients = require('./seedPatients');
const seedDoctorSlots = require('./seedDoctorSlots');
const seedMedicalRecords = require('./seedMedicalRecords');
const seedReviews = require('./seedReviews');

/**
 * Realistic Queue Seeder
 * 1. Resets Database (Changes schema if needed)
 * 2. Seeds 50 Doctors, 100 Patients
 * 3. Creates realistic Live Queue data for TODAY
 */
async function realisticQueueSeed() {
    console.log('🚀 Starting Realistic Live Queue Seeding...\n');
    console.log('='.repeat(60));

    try {
        // 1. Reset Database using schema.sql
        console.log('Phase 0: Resetting Database Schema');
        console.log('-'.repeat(60));
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // remove all comments -- ... and /* ... */
        const cleanSql = schemaSql
            .replace(/--.*$/gm, '') // Remove single line comments
            .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

        const statements = cleanSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        const connection = await pool.getConnection();

        // Disable foreign key checks temporarily
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log(`Executing ${statements.length} schema statements...`);
        for (const statement of statements) {
            try {
                await connection.query(statement);
            } catch (err) {
                console.error('❌ Error executing statement:', statement.substring(0, 50) + '...', err.message);
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        connection.release();
        console.log('✅ Database reset successfully\n');

        // 2. Seed Users
        console.log('Phase 1: Core Users (50 Doctors, 100 Patients)');
        console.log('-'.repeat(60));
        await seedUsers({ patients: 100, doctors: 50, admins: 5, superAdmins: 1 });
        console.log('');

        // 3. Hospital Infrastructure
        console.log('Phase 2: Hospital Infrastructure');
        console.log('-'.repeat(60));
        const hospitalIds = await seedHospitals(10);
        console.log('');

        // 4. Doctor Profiles
        console.log('Phase 3: Doctor Profiles');
        console.log('-'.repeat(60));
        await seedDoctors(hospitalIds);
        console.log('');

        // 5. Patient Profiles
        console.log('Phase 4: Patient Profiles');
        console.log('-'.repeat(60));
        await seedPatients();
        console.log('');

        // 6. Doctor Slots
        console.log('Phase 5: Doctor Slots');
        console.log('-'.repeat(60));
        await seedDoctorSlots();
        console.log('');

        // 7. REALISTIC LIVE QUEUE APPOINTMENTS
        console.log('Phase 6: Live Queue Appointments (Detailed)');
        console.log('-'.repeat(60));
        const appointmentIds = await seedLiveQueueAppointments();
        console.log('');

        // 8. Extras
        console.log('Phase 7: Medical Records & Reviews');
        console.log('-'.repeat(60));
        await seedMedicalRecords();
        await seedReviews(appointmentIds);
        console.log('');

        console.log('='.repeat(60));
        console.log('✅ SEEDING COMPLETE! Ready for Live Queue Testing.');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    }
}

/**
 * Custom function to seed appointments with guaranteed Queue data for TODAY
 */
async function seedLiveQueueAppointments() {
    console.log('🌱 Generating Live Queue Data...');
    const today = new Date().toISOString().split('T')[0];

    // Get all verified doctors and patients
    const [doctors] = await pool.execute('SELECT id, consultation_fee FROM doctors');
    const [patients] = await pool.execute('SELECT id FROM patients');

    const appointmentIds = [];
    let queueInsertCount = 0;

    // Process each doctor to ensure they have a queue today
    // We'll activate queues for first 20 doctors heavily, others randomly
    for (let i = 0; i < doctors.length; i++) {
        const doctor = doctors[i];
        const isActiveQueueDoctor = i < 20; // First 20 doctors have active queues today

        // 1. Create Past Appointments (History)
        const numPast = faker.number.int({ min: 5, max: 15 });
        for (let j = 0; j < numPast; j++) {
            const patient = faker.helpers.arrayElement(patients);
            const date = faker.date.past({ years: 1 });
            // Ensure date is string YYYY-MM-DD
            const dateStr = date.toISOString().split('T')[0];

            const [res] = await pool.execute(
                `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit, completed_at)
                 VALUES (?, ?, ?, '10:00:00', 'PHYSICAL', 'COMPLETED', ?, ?)`,
                [patient.id, doctor.id, dateStr, faker.lorem.sentence(), date]
            );
            appointmentIds.push(res.insertId);
        }

        // 2. Create TODAY'S Queue (If active)
        if (isActiveQueueDoctor) {
            // Status distribution for today's queue
            // e.g., 2 Completed, 1 In-Progress, 5 Waiting (Confirmed/Pending)
            const queueSequence = [
                { status: 'COMPLETED', queueNum: 1 },
                { status: 'COMPLETED', queueNum: 2 },
                { status: 'IN_PROGRESS', queueNum: 3 }, // Current patient
                { status: 'CONFIRMED', queueNum: 4 },   // Waiting
                { status: 'CONFIRMED', queueNum: 5 },
                { status: 'CONFIRMED', queueNum: 6 },
                { status: 'PENDING', queueNum: 7 },
                { status: 'PENDING', queueNum: 8 },
            ];

            for (const item of queueSequence) {
                const patient = faker.helpers.arrayElement(patients);
                const timeStr = `${9 + Math.floor(item.queueNum / 2)}:${(item.queueNum % 2) * 30}:00`.padStart(8, '0'); // varying times

                // Insert Appointment
                const [apptRes] = await pool.execute(
                    `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit, started_at, completed_at)
                     VALUES (?, ?, ?, ?, 'PHYSICAL', ?, ?, ?, ?)`,
                    [patient.id, doctor.id, today, timeStr, item.status, faker.lorem.sentence(),
                    item.status === 'IN_PROGRESS' || item.status === 'COMPLETED' ? new Date() : null,
                    item.status === 'COMPLETED' ? new Date() : null]
                );

                const appointmentId = apptRes.insertId;
                appointmentIds.push(appointmentId);

                // Insert into Queue (CRITICAL FOR LIVE QUEUE)
                await pool.execute(
                    `INSERT INTO appointment_queue (appointment_id, doctor_id, patient_id, queue_number, queue_date, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                    [appointmentId, doctor.id, patient.id, item.queueNum, today,
                        item.status === 'CONFIRMED' || item.status === 'PENDING' ? 'WAITING' : item.status]
                );
                queueInsertCount++;
            }
        }
    }

    console.log(`✅ Created ${appointmentIds.length} total appointments`);
    console.log(`✅ Created ${queueInsertCount} ACTIVE queue entries for TODAY (${today})`);
    return appointmentIds;
}

// Run
realisticQueueSeed();
