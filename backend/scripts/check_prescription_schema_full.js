const pool = require('../config/db');

async function checkPrescriptionSchema() {
    try {
        console.log('=== PRESCRIPTIONS TABLE SCHEMA ===\n');

        // Get table structure
        const [columns] = await pool.execute('DESCRIBE prescriptions');
        console.log('Columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
        });

        console.log('\n=== RECENT PRESCRIPTIONS ===\n');
        const [prescriptions] = await pool.execute(
            'SELECT * FROM prescriptions ORDER BY created_at DESC LIMIT 3'
        );

        if (prescriptions.length === 0) {
            console.log('No prescriptions found.');
        } else {
            prescriptions.forEach((p, i) => {
                console.log(`\nPrescription #${i + 1}:`);
                Object.keys(p).forEach(key => {
                    console.log(`  ${key}: ${p[key]}`);
                });
            });
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPrescriptionSchema();
