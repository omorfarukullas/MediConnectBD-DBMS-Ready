const pool = require('../config/db');

async function addShareMedicalHistoryColumn() {
    try {
        console.log('Adding share_medical_history column to patients table...');

        await pool.execute(`
            ALTER TABLE patients 
            ADD COLUMN share_medical_history BOOLEAN DEFAULT true 
            COMMENT 'Allow doctors to view medical history during consultations'
        `);

        console.log('✅ Column share_medical_history added successfully');

        // Verify the column was added
        const [columns] = await pool.execute('DESCRIBE patients');
        console.log('\n📋 Updated patients table columns:');
        columns.forEach(col => {
            console.log(` - ${col.Field} (${col.Type})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addShareMedicalHistoryColumn();
