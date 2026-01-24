const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function testAddDoctor() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const email = 'test.doctor.debug@mediconnect.com';
        const password = 'test123';
        const name = 'Dr. Debug Test';
        const specialization = 'General Medicine';
        const consultation_fee = 500;
        const experience_years = 5;
        const hospitalId = 30010;

        // Check if email exists
        const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            console.log('User already exists, deleting for test...');
            await connection.execute('DELETE FROM users WHERE email = ?', [email]);
        }

        // 1. Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Creating user...');
        const [userResult] = await connection.execute(
            'INSERT INTO users (email, password, role) VALUES (?, ?, "DOCTOR")',
            [email, hashedPassword]
        );
        console.log('User created with ID:', userResult.insertId);

        // 2. Create doctor profile
        console.log('Creating doctor profile...');
        const [doctorResult] = await connection.execute(
            'INSERT INTO doctors (user_id, hospital_id, full_name, specialization, consultation_fee, experience_years, status) VALUES (?, ?, ?, ?, ?, ?, "Active")',
            [userResult.insertId, hospitalId, name, specialization, consultation_fee, experience_years]
        );
        console.log('Doctor created with ID:', doctorResult.insertId);

        await connection.commit();
        console.log('SUCCESS! Doctor added successfully');

        // Clean up test
        await connection.execute('DELETE FROM users WHERE email = ?', [email]);
        console.log('Test cleaned up');

    } catch (error) {
        await connection.rollback();
        console.error('ERROR:', error.message);
        console.error('Full error:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

testAddDoctor();
