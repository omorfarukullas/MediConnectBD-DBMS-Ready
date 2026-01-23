/**
 * Queue Testing Helper
 * Finds doctors with today's queue and displays testing information
 * Compatible with Faker.js database
 */

const pool = require('../config/db');

async function findQueueForTesting() {
    console.log('🔍 Finding Queue for Testing\n');
    console.log('='.repeat(60) + '\n');

    try {
        const connection = await pool.getConnection();
        const today = new Date().toISOString().split('T')[0];

        // Find doctors with today's appointments
        const [doctors] = await connection.query(
            `SELECT d.id, d.full_name, d.email, d.specialization,
                    COUNT(a.id) as queue_count
             FROM doctors d
             INNER JOIN appointments a ON d.id = a.doctor_id
             WHERE a.appointment_date = ?
             GROUP BY d.id
             ORDER BY queue_count DESC
             LIMIT 3`,
            [today]
        );

        if (doctors.length === 0) {
            console.log(`❌ No doctors have appointments for today (${today})`);
            console.log('\n💡 To generate test data, run:');
            console.log('   node backend/scripts/seeders/masterSeed.js');
            connection.release();
            await pool.end();
            return;
        }

        console.log(`📅 Date: ${today}`);
        console.log(`✅ Found ${doctors.length} doctor(s) with appointments\n`);

        for (const doctor of doctors) {
            console.log(`👨‍⚕️ ${doctor.full_name}`);
            console.log(`   ID: ${doctor.id}`);
            console.log(`   Email: ${doctor.email}`);
            console.log(`   Specialization: ${doctor.specialization}`);
            console.log(`   Queue Size: ${doctor.queue_count}`);

            // Get queue details
            const [queue] = await connection.query(
                `SELECT a.queue_number, a.appointment_time, a.status,
                        p.full_name as patient_name
                 FROM appointments a
                 LEFT JOIN patients p ON a.patient_id = p.id
                 WHERE a.doctor_id = ? AND a.appointment_date = ?
                 ORDER BY a.queue_number`,
                [doctor.id, today]
            );

            console.log('   Queue:');
            queue.forEach(appt => {
                console.log(`     #${appt.queue_number}: ${appt.patient_name} @ ${appt.appointment_time} [${appt.status}]`);
            });
            console.log('');
        }

        const testDoctor = doctors[0];
        console.log('='.repeat(60));
        console.log('🎯 TESTING INSTRUCTIONS');
        console.log('='.repeat(60));
        console.log(`\n1. Log in to Doctor Portal:`);
        console.log(`   URL: http://localhost:3000`);
        console.log(`   Email: ${testDoctor.email}`);
        console.log(`   Password: password123`);
        console.log(`\n2. Navigate to "Live Queue" in sidebar`);
        console.log(`\n3. You should see ${testDoctor.queue_count} appointment(s)`);
        console.log(`\n4. Test queue management:`);
        console.log(`   - View queue statistics`);
        console.log(`   - Call next patient`);
        console.log(`   - Start appointment`);
        console.log(`   - Complete appointment`);
        console.log('\n' + '='.repeat(60));

        connection.release();
        await pool.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

findQueueForTesting();
