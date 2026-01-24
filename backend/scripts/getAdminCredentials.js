const pool = require('../config/db');

async function getAdminCredentials() {
    try {
        console.log('\n🔍 Fetching Hospital Admin Credentials...\n');

        const [users] = await pool.execute(`
            SELECT u.id, u.email, u.role, ha.hospital_id, h.name as hospital_name, ha.full_name
            FROM users u 
            LEFT JOIN hospital_admins ha ON u.id = ha.user_id
            LEFT JOIN hospitals h ON ha.hospital_id = h.id
            WHERE u.role = 'HOSPITAL_ADMIN' 
            ORDER BY u.id
            LIMIT 5
        `);

        if (users.length === 0) {
            console.log('❌ No hospital admin accounts found!\n');
            console.log('💡 You may need to run the database seeders first:\n');
            console.log('   npm run seed\n');
        } else {
            let output = '\n📋 Hospital Admin Login Credentials (TOP 5):\n';
            output += '═══════════════════════════════════════════════════════════\n\n';

            users.forEach((u, idx) => {
                output += `${idx + 1}. 📧 Email: ${u.email}\n`;
                output += `   👤 Name: ${u.full_name || 'Not set'}\n`;
                output += `   🏥 Hospital: ${u.hospital_name || 'Not assigned'} (ID: ${u.hospital_id || 'N/A'})\n`;
                output += `   🔑 Password: password123\n\n`;
            });

            output += '═══════════════════════════════════════════════════════════\n';
            output += '✅ Use any of the above credentials to login at: http://localhost:3000\n';

            console.log(output);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

getAdminCredentials();
