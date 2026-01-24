
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
process.env.DB_NAME = 'mediconnectbdv2';
const pool = require('../config/db');

async function checkSlots() {
    try {
        console.log('🔍 Checking Doctor Slots for Doctor ID 10...');
        const [slots] = await pool.execute('SELECT * FROM doctor_slots WHERE doctor_id = 10');
        console.log(JSON.stringify(slots, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkSlots();
