const pool = require('../config/db');
const seedDoctorSlots = require('./seeders/seedDoctorSlots');

async function run() {
    try {
        console.log('🔄 Cleaning up old slots and appointments...');
        const connection = await pool.getConnection();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE doctor_slots');
        await connection.query('TRUNCATE TABLE appointments');
        await connection.query('TRUNCATE TABLE appointment_queue');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        connection.release();

        console.log('🌱 Starting Seeder...');
        await seedDoctorSlots();

        console.log('✅ Seeding Complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

run();
