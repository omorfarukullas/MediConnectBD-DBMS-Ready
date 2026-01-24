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
 * Enhanced with more comprehensive queue tracking scenarios
 */
async function seedLiveQueueAppointments() {
    console.log('🌱 Generating Comprehensive Live Queue Data...');
    const today = new Date().toISOString().split('T')[0];

    // Get all verified doctors and patients
    const [doctors] = await pool.execute('SELECT id, consultation_fee FROM doctors');
    const [patients] = await pool.execute('SELECT id FROM patients');

    const appointmentIds = [];
    let queueInsertCount = 0;

    // Process each doctor to ensure they have a queue today
    // We'll activate queues for first 30 doctors with varying queue sizes
    for (let i = 0; i < doctors.length; i++) {
        const doctor = doctors[i];
        const isActiveQueueDoctor = i < 30; // First 30 doctors have active queues today

        // 1. Create Past Appointments (History) - More data for better analytics
        const numPast = faker.number.int({ min: 10, max: 25 });
        for (let j = 0; j < numPast; j++) {
            const patient = faker.helpers.arrayElement(patients);
            const date = faker.date.past({ years: 1 });
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
            // Varying queue sizes based on doctor index for realistic distribution
            let numQueueEntries = 8; // Default
            if (i < 10) numQueueEntries = faker.number.int({ min: 12, max: 15 }); // Busy doctors
            else if (i < 20) numQueueEntries = faker.number.int({ min: 8, max: 12 }); // Medium
            else numQueueEntries = faker.number.int({ min: 5, max: 8 }); // Light

            // Create dynamic queue sequence
            const queueSequence = [];

            // First entries are completed (already seen patients)
            const numCompleted = Math.floor(numQueueEntries * 0.3); // 30% completed
            for (let q = 1; q <= numCompleted; q++) {
                queueSequence.push({ status: 'COMPLETED', queueNum: q });
            }

            // One in progress (current patient)
            queueSequence.push({ status: 'IN_PROGRESS', queueNum: numCompleted + 1 });

            // Rest are waiting (confirmed/pending)
            for (let q = numCompleted + 2; q <= numQueueEntries; q++) {
                const status = Math.random() < 0.7 ? 'CONFIRMED' : 'PENDING';
                queueSequence.push({ status, queueNum: q });
            }

            console.log(`   Doctor ${i + 1}: Creating ${queueSequence.length} queue entries (${numCompleted} completed, 1 in-progress, ${queueSequence.length - numCompleted - 1} waiting)`);

            for (const item of queueSequence) {
                const patient = faker.helpers.arrayElement(patients);

                // More realistic time distribution throughout the day
                const baseHour = 8; // Start at 8 AM
                const hourOffset = Math.floor((item.queueNum - 1) / 4); // ~4 patients per hour
                const minuteOffset = ((item.queueNum - 1) % 4) * 15; // 15 min intervals
                const hour = (baseHour + hourOffset).toString().padStart(2, '0');
                const minute = minuteOffset.toString().padStart(2, '0');
                const timeStr = `${hour}:${minute}:00`;

                // Varied consultation types
                const consultationType = Math.random() < 0.8 ? 'PHYSICAL' : 'TELEMEDICINE';

                // Calculate realistic timestamps
                const baseTime = new Date(`${today}T${timeStr}`);
                const started_at = (item.status === 'IN_PROGRESS' || item.status === 'COMPLETED')
                    ? new Date(baseTime.getTime())
                    : null;
                const completed_at = item.status === 'COMPLETED'
                    ? new Date(baseTime.getTime() + (15 + Math.random() * 15) * 60 * 1000) // 15-30 min consultation
                    : null;

                // Insert Appointment
                const [apptRes] = await pool.execute(
                    `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit, started_at, completed_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [patient.id, doctor.id, today, timeStr, consultationType, item.status,
                    faker.helpers.arrayElement([
                        'General checkup',
                        'Follow-up consultation',
                        'Fever and cold',
                        'Blood pressure check',
                        'Diabetes management',
                        'Chest pain',
                        'Headache',
                        'Stomach pain'
                    ]),
                        started_at, completed_at]
                );

                const appointmentId = apptRes.insertId;
                appointmentIds.push(appointmentId);

                // Insert into Queue (CRITICAL FOR LIVE QUEUE)
                const queueStatus = item.status === 'CONFIRMED' || item.status === 'PENDING'
                    ? 'WAITING'
                    : item.status;

                const called_at = (item.status === 'IN_PROGRESS' || item.status === 'COMPLETED')
                    ? started_at
                    : null;

                await pool.execute(
                    `INSERT INTO appointment_queue (appointment_id, doctor_id, patient_id, queue_number, queue_date, status, called_at, started_at, completed_at, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [appointmentId, doctor.id, patient.id, item.queueNum, today,
                        queueStatus, called_at, started_at, completed_at]
                );
                queueInsertCount++;

                // Create earnings record if appointment is completed
                if (item.status === 'COMPLETED') {
                    await pool.execute(
                        `INSERT INTO doctor_earnings (doctor_id, appointment_id, patient_id, amount, consultation_type, payment_status, earned_date)
                         VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)`,
                        [doctor.id, appointmentId, patient.id, doctor.consultation_fee, consultationType, today]
                    );
                }
            }
        }
    }

    console.log(`✅ Created ${appointmentIds.length} total appointments`);
    console.log(`✅ Created ${queueInsertCount} ACTIVE queue entries for TODAY (${today})`);
    console.log(`   📊 Queue Distribution: ~30% completed, ~5% in-progress, ~65% waiting`);
    return appointmentIds;
}

// Run
realisticQueueSeed();
