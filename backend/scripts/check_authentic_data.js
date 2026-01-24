const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
// Override DB_NAME to be sure
process.env.DB_NAME = 'mediconnectbdv2';
const pool = require('../config/db');

async function checkAuthenticity() {
    try {
        console.log('🔍 QUERYING DIRECTLY FROM DATABASE...');
        console.log('---------------------------------------------------');

        const [rows] = await pool.execute(`
            SELECT 
                a.id, 
                a.status, 
                a.appointment_date, 
                a.appointment_time, 
                p.full_name as patient_name, 
                d.full_name as doctor_name,
                a.created_at
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            ORDER BY a.created_at DESC
            LIMIT 5
        `);

        console.log(`✅ FOUND ${rows.length} REAL DATABASE RECORDS:`);
        console.log(JSON.stringify(rows, null, 2));

        if (rows.length > 0) {
            console.log('\n✅ CONCLUSION: Data is AUTHENTIC and coming from the MySQL table `appointments`.');
            const pendingCount = rows.filter(r => r.status === 'PENDING').length;
            if (pendingCount > 0) {
                console.log(`⚠️ NOTE: ${pendingCount}/${rows.length} recent appointments are 'PENDING'.`);
                console.log('   This explains why they are "not confirmed".');
            }
        } else {
            console.log('❌ NO DATA FOUND in database.');
        }

    } catch (error) {
        console.error('❌ DATABASE ERROR:', error);
    } finally {
        process.exit();
    }
}

checkAuthenticity();
