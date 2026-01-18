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

async function checkSchema() {
    try {
        console.log('🔍 Checking database schema...\n');
        
        // Check appointments table
        console.log('📋 APPOINTMENTS TABLE:');
        const [appointments] = await pool.execute('DESCRIBE appointments');
        appointments.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        
        // Check medical_documents table
        console.log('\n📄 MEDICAL_DOCUMENTS TABLE:');
        const [documents] = await pool.execute('DESCRIBE medical_documents');
        documents.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        
        // Check prescriptions table
        console.log('\n💊 PRESCRIPTIONS TABLE:');
        const [prescriptions] = await pool.execute('DESCRIBE prescriptions');
        prescriptions.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        
        // Check if patient_vitals exists
        console.log('\n❤️ PATIENT_VITALS TABLE:');
        try {
            const [vitals] = await pool.execute('DESCRIBE patient_vitals');
            vitals.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type})`);
            });
        } catch (err) {
            console.log('  ⚠️ Table does not exist');
        }
        
        // Check if reviews exists
        console.log('\n⭐ REVIEWS TABLE:');
        try {
            const [reviews] = await pool.execute('DESCRIBE reviews');
            reviews.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type})`);
            });
        } catch (err) {
            console.log('  ⚠️ Table does not exist');
        }
        
        // Check if telemedicine_sessions exists
        console.log('\n🎥 TELEMEDICINE_SESSIONS TABLE:');
        try {
            const [telemedicine] = await pool.execute('DESCRIBE telemedicine_sessions');
            telemedicine.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type})`);
            });
        } catch (err) {
            console.log('  ⚠️ Table does not exist');
        }
        
        // Check if doctor_earnings exists
        console.log('\n💰 DOCTOR_EARNINGS TABLE:');
        try {
            const [earnings] = await pool.execute('DESCRIBE doctor_earnings');
            earnings.forEach(col => {
                console.log(`  - ${col.Field} (${col.Type})`);
            });
        } catch (err) {
            console.log('  ⚠️ Table does not exist');
        }
        
        console.log('\n✅ Schema check complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkSchema();
