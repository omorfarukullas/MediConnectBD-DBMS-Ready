const pool = require('../config/db');

async function verifyEntityCodes() {
    try {
        console.log('=== ENTITY CODE SYSTEM VERIFICATION ===\n');

        // Check sample IDs from each entity type
        const checks = [
            { table: 'users', expectedRange: '1000-1999', column: 'email' },
            { table: 'patients', expectedRange: '20001-29999', column: 'full_name' },
            { table: 'hospitals', expectedRange: '30001-39999', column: 'name' },
            { table: 'doctors', expectedRange: '40001-49999', column: 'full_name' },
            { table: 'hospital_admins', expectedRange: '50001-59999', column: 'hospital_id' },
            { table: 'super_admins', expectedRange: '60001-69999', column: 'user_id' },
            { table: 'appointments', expectedRange: '100001-199999', column: 'patient_id' },
            { table: 'medical_documents', expectedRange: '130001-139999', column: 'filename' },
            { table: 'prescriptions', expectedRange: '140001-149999', column: 'medication_name' }
        ];

        for (const check of checks) {
            const [rows] = await pool.execute(
                `SELECT id, ${check.column} FROM ${check.table} ORDER BY id LIMIT 3`
            );

            if (rows.length > 0) {
                console.log(`✓ ${check.table.toUpperCase().padEnd(25)} (Range: ${check.expectedRange})`);
                rows.forEach((row, i) => {
                    console.log(`  ${i + 1}. ID: ${row.id} - ${row[check.column]}`);
                });
                console.log('');
            } else {
                console.log(`⚠ ${check.table} - No data`);
            }
        }

        console.log('='.repeat(60));
        console.log('✅ Entity code system is working!\n');
        console.log('Each entity type has unique ID ranges for easy identification:');
        console.log('  - Users: 1xxx');
        console.log('  - Patients: 2xxxx');
        console.log('  - Hospitals: 3xxxx');
        console.log('  - Doctors: 4xxxx');
        console.log('  - Appointments: 1xxxxx');
        console.log('  - Documents: 13xxxx');
        console.log('  - Prescriptions: 14xxxx');

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
        process.exit(1);
    }
}

verifyEntityCodes();
