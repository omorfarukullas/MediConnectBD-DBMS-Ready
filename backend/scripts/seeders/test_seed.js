const seedHospitals = require('./seedHospitals');
const pool = require('../../config/db');

async function test() {
    try {
        console.log('Testing seedHospitals...');
        const result = await seedHospitals(2);
        console.log('Success!', result);
    } catch (e) {
        console.error('Failed:', e);
    } finally {
        await pool.end();
    }
}

test();
