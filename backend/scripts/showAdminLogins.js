const pool = require('../config/db');

async function getSimpleAdminCredentials() {
    try {
        const [users] = await pool.execute(`
            SELECT u.email, ha.full_name, h.name as hospital_name
            FROM users u 
            JOIN hospital_admins ha ON u.id = ha.user_id
            JOIN hospitals h ON ha.hospital_id = h.id
            WHERE u.role = 'HOSPITAL_ADMIN' 
            ORDER BY u.id
            LIMIT 10
        `);

        console.log('\n🔐 Hospital Admin Login Credentials:\n');
        users.forEach((u, idx) => {
            console.log(`${idx + 1}. Email: ${u.email}`);
            console.log(`   Name: ${u.full_name}`);
            console.log(`   Hospital: ${u.hospital_name}`);
            console.log(`   Password: password123\n`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

getSimpleAdminCredentials();
