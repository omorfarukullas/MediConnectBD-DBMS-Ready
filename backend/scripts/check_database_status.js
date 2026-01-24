/**
 * Quick Database Status Check
 * Shows current state of mediconnectbdv2 database (Faker.js data)
 */

const pool = require('../config/db');

async function checkDatabaseStatus() {
    console.log('📊 MediConnect BD Database Status Check\n');
    console.log('Database: mediconnectbdv2 (Faker.js Data)');
    console.log('='.repeat(60) + '\n');

    try {
        const connection = await pool.getConnection();

        // Get table counts
        const tables = [
            { name: 'users', label: 'Users (Total)' },
            { name: 'patients', label: 'Patients' },
            { name: 'doctors', label: 'Doctors' },
            { name: 'hospitals', label: 'Hospitals' },
            { name: 'doctor_slots', label: 'Doctor Slots' },
            { name: 'appointments', label: 'Appointments (Total)' },
            { name: 'reviews', label: 'Reviews' }
        ];

        console.log('📈 Table Counts:');
        console.log('-'.repeat(60));
        for (const table of tables) {
            const [result] = await connection.query(`SELECT COUNT(*) as count FROM ${table.name}`);
            console.log(`   ${table.label.padEnd(30)} : ${result[0].count}`);
        }

        // Today's appointments
        const today = new Date().toISOString().split('T')[0];
        const [todayAppts] = await connection.query(
            'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?',
            [today]
        );
        console.log(`   ${'Appointments Today'.padEnd(30)} : ${todayAppts[0].count}`);

        // Get sample doctor with appointments
        const [doctors] = await connection.query(
            `SELECT d.id, d.full_name, u.email, COUNT(a.id) as appt_count
             FROM doctors d
             JOIN users u ON d.user_id = u.id
             LEFT JOIN appointments a ON d.id = a.doctor_id AND a.appointment_date = ?
             GROUP BY d.id, u.email
             HAVING appt_count > 0
             ORDER BY appt_count DESC
             LIMIT 1`,
            [today]
        );

        console.log('\n🔑 Test Login Credentials:');
        console.log('-'.repeat(60));
        console.log('   All users have password: password123');
        console.log('');
        console.log('   Super Admin:');
        console.log('   Email: superadmin@mediconnect.com');
        console.log('');

        // Get sample patient
        const [patients] = await connection.query(
            `SELECT p.id, p.full_name, u.email 
             FROM patients p
             JOIN users u ON p.user_id = u.id
             LIMIT 1`
        );

        if (patients.length > 0) {
            console.log('   Sample Patient:');
            console.log(`   Email: ${patients[0].email}`);
            console.log(`   Name: ${patients[0].full_name}`);
            console.log(`   ID: ${patients[0].id}`);
            console.log('');
        }

        if (doctors.length > 0) {
            console.log('   Doctor with today\'s queue:');
            console.log(`   Email: ${doctors[0].email}`);
            console.log(`   Name: ${doctors[0].full_name}`);
            console.log(`   Appointments Today: ${doctors[0].appt_count}`);
        }

        connection.release();
        await pool.end();

        console.log('\n' + '='.repeat(60));
        console.log('✅ Database status check complete');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkDatabaseStatus();
