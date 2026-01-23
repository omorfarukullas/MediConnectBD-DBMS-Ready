const pool = require('../config/db');

async function checkSlots() {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM doctor_slots');
        console.log(`📊 Total Doctor Slots: ${rows[0].count}`);

        const [samples] = await pool.query('SELECT * FROM doctor_slots LIMIT 3');
        console.log('🔎 Sample Slots:', JSON.stringify(samples, null, 2));

        if (rows[0].count === 0) {
            console.log('❌ No slots found!');
        } else {
            console.log('✅ Slots exist in DB.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkSlots();
