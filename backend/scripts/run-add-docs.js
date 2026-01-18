const mysql = require('mysql2/promise');
const fs = require('fs').promises;

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'mediconnect',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true
});

async function addDocumentsAndPrescriptions() {
    try {
        console.log('📄 Reading SQL file...');
        const sql = await fs.readFile('./add-documents-prescriptions.sql', 'utf8');
        
        console.log('🚀 Executing SQL...\n');
        await pool.query(sql);
        
        console.log('✅ Successfully added documents and prescriptions!\n');
        
        // Verify
        const [docs] = await pool.execute('SELECT COUNT(*) as count FROM medical_documents WHERE user_id >= 4');
        console.log(`📋 Total Medical Documents: ${docs[0].count}`);
        
        const [presc] = await pool.execute('SELECT COUNT(*) as count FROM prescriptions WHERE patient_id >= 4');
        console.log(`💊 Total Prescriptions: ${presc[0].count}`);
        
        const [completedAppts] = await pool.execute('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = 4 AND status = "COMPLETED"');
        console.log(`✅ Total Completed Appointments: ${completedAppts[0].count}`);
        
        const [reviews] = await pool.execute('SELECT COUNT(*) as count FROM reviews WHERE doctor_id = 4');
        console.log(`⭐ Total Reviews: ${reviews[0].count}\n`);
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        await pool.end();
        process.exit(1);
    }
}

addDocumentsAndPrescriptions();
