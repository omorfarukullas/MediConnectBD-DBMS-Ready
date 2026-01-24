const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function checkDocuments() {
    try {
        const [docs] = await pool.execute(
            'SELECT id, patient_id, filename, filepath FROM medical_documents LIMIT 5'
        );

        console.log(`\n📄 Found ${docs.length} documents in database:\n`);

        docs.forEach(doc => {
            const fullPath = path.resolve(doc.filepath);
            const exists = fs.existsSync(fullPath);

            console.log(`ID: ${doc.id}`);
            console.log(`  File: ${doc.filename}`);
            console.log(`  Path: ${doc.filepath}`);
            console.log(`  Full Path: ${fullPath}`);
            console.log(`  Exists: ${exists ? '✅' : '❌'}`);
            console.log('');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkDocuments();
