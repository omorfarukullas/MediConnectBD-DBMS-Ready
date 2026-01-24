const pool = require('../config/db');

async function checkSchema() {
    console.log('Patients table columns:');
    const [patients] = await pool.execute('DESCRIBE patients');
    patients.forEach(r => console.log(`  - ${r.Field}`));

    console.log('\nDoctors table columns:');
    const [doctors] = await pool.execute('DESCRIBE doctors');
    doctors.forEach(r => console.log(`  - ${r.Field}`));

    await pool.end();
}

checkSchema();
