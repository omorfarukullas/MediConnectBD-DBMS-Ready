const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function debugAppointmentsQuery() {
    console.log('🔍 Debugging Appointments SQL Query\n');

    try {
        // Mock user ID (Doctor ID 30 corresponding to dee.lockman@gmail.com which is ID 30 or 10061?)
        // Let's get the ID first
        // 1. Get User ID first, then Doctor ID
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', ['dee.lockman@gmail.com']);
        if (users.length === 0) {
            console.log('❌ User not found');
            return;
        }
        const userId = users[0].id;

        const [docs] = await pool.query('SELECT id FROM doctors WHERE user_id = ?', [userId]);
        if (docs.length === 0) {
            console.log('❌ Doctor profile not found for user');
            return;
        }
        const doctorId = docs[0].id;
        console.log(`Testing with Doctor ID: ${doctorId}`);

        // The query from appointmentController.js
        const query = `
            SELECT 
                a.id,
                a.patient_id,
                a.doctor_id,
                a.consultation_type as appointment_type,
                a.appointment_date as date,
                a.appointment_time as time,
                a.reason_for_visit,
                a.status,
                aq.queue_number,
                aq.status as queue_status,
                a.started_at,
                a.completed_at,
                a.created_at,
                a.updated_at,
                p.full_name as patient_name,
                pu.email as patient_email,
                p.phone as patient_phone,
                d.full_name as doctor_name,
                du.email as doctor_email,
                d.specialization as doctor_specialization,
                h.city as doctor_city,
                d.consultation_fee,
                ds.start_time as session_start_time,
                ds.end_time as session_end_time,
                ds.max_patients as session_capacity
            FROM appointments a
            LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN users pu ON p.user_id = pu.id
            LEFT JOIN doctors d ON a.doctor_id = d.id
            LEFT JOIN users du ON d.user_id = du.id
            LEFT JOIN hospitals h ON d.hospital_id = h.id
            LEFT JOIN doctor_slots ds ON (d.id = ds.doctor_id AND DAYNAME(a.appointment_date) = ds.day_of_week)
            WHERE a.doctor_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `;

        const [results] = await pool.execute(query, [doctorId]);
        console.log(`✅ Query successful! Found ${results.length} rows.`);

    } catch (error) {
        console.error('❌ SQL Error:', error.message);
        console.error('Code:', error.code);

        // Let's check which table/column is missing
        await checkSchema();
    }
}

async function checkSchema() {
    console.log('\n📋 Checking Schema...');
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Tables:', tableNames.join(', '));

        if (tableNames.includes('hospitals')) {
            const [hCols] = await pool.query('DESCRIBE hospitals');
            console.log('Hospitals Columns:', hCols.map(c => c.Field).join(', '));
        }

        if (tableNames.includes('doctor_slots')) {
            const [dsCols] = await pool.query('DESCRIBE doctor_slots');
            console.log('Doctor Slots Columns:', dsCols.map(c => c.Field).join(', '));
        }

        if (tableNames.includes('doctors')) {
            const [dCols] = await pool.query('DESCRIBE doctors');
            console.log('Doctors Columns:', dCols.map(c => c.Field).join(', '));
        }
    } catch (e) {
        console.log('Error checking schema:', e.message);
    }
    await pool.end();
}

debugAppointmentsQuery();
