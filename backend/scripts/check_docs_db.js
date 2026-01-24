const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

async function checkDocuments() {
    try {
        console.log('Checking recent medical documents...\n');

        const [rows] = await pool.execute(
            'SELECT id, patient_id, filename, filepath, upload_date FROM medical_documents ORDER BY upload_date DESC LIMIT 5'
        );

        if (rows.length === 0) {
            console.log('No documents found in database.');
            await pool.end();
            return;
        }

        console.log('Recent documents:');
        rows.forEach(doc => {
            console.log(`\nID: ${doc.id}`);
            console.log(`  Patient: ${doc.patient_id}`);
            console.log(`  Filename: ${doc.filename}`);
            console.log(`  DB Path: ${doc.filepath}`);
            console.log(`  Upload Date: ${doc.upload_date}`);

            // Check if file exists
            const filePath = path.join(__dirname, '..', doc.filepath);
            console.log(`  Resolved Path: ${filePath}`);
            console.log(`  File Exists: ${fs.existsSync(filePath) ? 'YES ✓' : 'NO ✗'}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDocuments();
