
const pool = require('./config/db');

async function checkDate() {
    try {
        const [rows] = await pool.execute("SELECT CURDATE() as curdate, NOW() as now, @@global.time_zone, @@session.time_zone");
        console.log('MySQL Date Info:', rows[0]);
        console.log('JS Date (UTC):', new Date().toISOString());
        console.log('JS Date (Local):', new Date().toString());
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDate();
