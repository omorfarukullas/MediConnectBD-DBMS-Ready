const pool = require('../config/db');

async function checkCurrentSchema() {
    try {
        console.log('=== CHECKING CURRENT DATABASE SCHEMA ===\n');

        // Check medical_documents table
        console.log('📄 MEDICAL_DOCUMENTS TABLE:');
        console.log('-'.repeat(60));
        const [docCols] = await pool.execute('DESCRIBE medical_documents');
        docCols.forEach(col => {
            console.log(`  ${col.Field.padEnd(25)} ${col.Type.padEnd(25)} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL    '} ${col.Key || ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
        });

        // Check prescriptions table
        console.log('\n💊 PRESCRIPTIONS TABLE:');
        console.log('-'.repeat(60));
        const [prescCols] = await pool.execute('DESCRIBE prescriptions');
        prescCols.forEach(col => {
            console.log(`  ${col.Field.padEnd(25)} ${col.Type.padEnd(25)} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL    '} ${col.Key || ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
        });

        // Check patients table (for share_medical_history)
        console.log('\n👤 PATIENTS TABLE (selected columns):');
        console.log('-'.repeat(60));
        const [patCols] = await pool.execute('DESCRIBE patients');
        const relevantPatientCols = ['id', 'user_id', 'blood_group', 'weight', 'height', 'share_medical_history'];
        patCols.filter(c => relevantPatientCols.includes(c.Field)).forEach(col => {
            console.log(`  ${col.Field.padEnd(25)} ${col.Type.padEnd(25)} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL    '} ${col.Key || ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
        });

        // Sample data check
        console.log('\n=== SAMPLE DATA CHECK ===\n');

        const [docs] = await pool.execute('SELECT id, patient_id, filename, filepath, visibility FROM medical_documents LIMIT 3');
        console.log('📄 Sample Documents:');
        docs.forEach(d => {
            console.log(`  ID ${d.id}: patient_id=${d.patient_id}, file=${d.filename}, visibility=${d.visibility}`);
            console.log(`    Path: ${d.filepath}`);
        });

        console.log('');
        const [presc] = await pool.execute('SELECT id, patient_id, doctor_id, medication_name, dosage, visibility FROM prescriptions LIMIT 3');
        console.log('💊 Sample Prescriptions:');
        presc.forEach(p => {
            console.log(`  ID ${p.id}: patient=${p.patient_id}, doctor=${p.doctor_id}, med=${p.medication_name}, visibility=${p.visibility}`);
        });

        await pool.end();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
        await pool.end();
        process.exit(1);
    }
}

checkCurrentSchema();
