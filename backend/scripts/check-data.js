const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'mediconnect',
    waitForConnections: true,
    connectionLimit: 10
});

async function checkData() {
    try {
        // Check patients table
        console.log('👥 PATIENTS:');
        const [patients] = await pool.execute('SELECT id, full_name, email FROM patients LIMIT 5');
        console.table(patients);
        
        // Check doctors table
        console.log('\n👨‍⚕️ DOCTORS:');
        const [doctors] = await pool.execute('SELECT id, full_name, email FROM doctors LIMIT 5');
        console.table(doctors);
        
        // Check appointments
        console.log('\n📅 APPOINTMENTS:');
        const [appointments] = await pool.execute(`
            SELECT 
                a.id,
                p.full_name as patient_name,
                d.full_name as doctor_name,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.queue_number
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN doctors d ON a.doctor_id = d.id
            LIMIT 10
        `);
        console.table(appointments);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkData();
