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

async function verifySetup() {
    try {
        // Count patients
        const [patients] = await pool.execute('SELECT COUNT(*) as count FROM patients');
        console.log(`\n👥 Total Patients: ${patients[0].count}`);
        
        const [allPatients] = await pool.execute('SELECT id, full_name, email FROM patients WHERE id >= 4');
        console.log('\nOur 8 Patients:');
        console.table(allPatients);
        
        // Count appointments for Dr.Test
        const [appts] = await pool.execute('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = 4');
        console.log(`\n📅 Dr.Test Total Appointments: ${appts[0].count}`);
        
        const [todayAppts] = await pool.execute(`
            SELECT p.full_name, a.appointment_date, a.appointment_time, a.status 
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = 4 AND a.appointment_date = CURDATE()
        `);
        console.log('\nToday\'s Appointments:');
        console.table(todayAppts);
        
        const [tomorrowAppts] = await pool.execute(`
            SELECT p.full_name, a.appointment_date, a.appointment_time, a.status 
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = 4 AND a.appointment_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        `);
        console.log('\nTomorrow\'s Appointments:');
        console.table(tomorrowAppts);
        
        const [pastAppts] = await pool.execute(`
            SELECT p.full_name, a.appointment_date, a.appointment_time, a.status 
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = 4 AND a.status = 'COMPLETED'
            ORDER BY a.appointment_date DESC
        `);
        console.log('\nCompleted Appointments:');
        console.table(pastAppts);
        
        // Count reviews
        const [reviews] = await pool.execute('SELECT COUNT(*) as count FROM reviews WHERE doctor_id = 4');
        console.log(`\n⭐ Total Reviews for Dr.Test: ${reviews[0].count}`);
        
        // Count earnings
        const [earnings] = await pool.execute('SELECT SUM(amount) as total FROM doctor_earnings WHERE doctor_id = 4');
        console.log(`\n💰 Total Earnings for Dr.Test: ${earnings[0].total || 0} BDT`);
        
        // Count vitals
        const [vitals] = await pool.execute('SELECT COUNT(*) as count FROM patient_vitals WHERE user_id >= 4');
        console.log(`\n❤️ Patient Vitals Recorded: ${vitals[0].count}`);
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

verifySetup();
