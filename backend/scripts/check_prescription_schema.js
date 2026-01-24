const pool = require('../config/db');

async function checkSchema() {
    try {
        const [cols] = await pool.execute('DESCRIBE prescriptions');
        console.log('\n📋 Prescriptions Table Schema:\n');
        cols.forEach(col => {
            console.log(`  - ${col.Field.padEnd(30)} ${col.Type}`);
        });

        // Check sample data
        const [sample] = await pool.execute('SELECT * FROM prescriptions LIMIT 1');
        console.log('\n📄 Sample prescription data:');
        if (sample.length > 0) {
            console.log(JSON.stringify(sample[0], null, 2));
        } else {
            console.log('  No prescriptions in database');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkSchema();
