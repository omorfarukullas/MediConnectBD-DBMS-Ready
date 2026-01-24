const pool = require('./config/db');

(async () => {
    try {
        // Simple query to show appointments per doctor
        const [results] = await pool.execute(`
            SELECT 
                d.full_name,
                COUNT(a.id) as count
            FROM doctors d
            LEFT JOIN appointments a ON d.id = a.doctor_id
            GROUP BY d.id, d.full_name
            ORDER BY count DESC
        `);

        console.log('\nDoctors and Appointment Counts:\n');
        results.forEach(r => {
            console.log(`${r.full_name}: ${r.count} appointments`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        await pool.end();
        process.exit(1);
    }
})();
