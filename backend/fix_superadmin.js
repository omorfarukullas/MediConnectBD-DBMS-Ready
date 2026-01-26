const pool = require('./config/db');

async function checkAndCreateSuperAdmin() {
    try {
        console.log('🔍 Checking super admin account...\n');

        // Check if super admin user exists
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE email = "superadmin@mediconnect.com"'
        );

        if (users.length === 0) {
            console.log('❌ Super admin not found. Please run the seeder first.');
            process.exit(1);
        }

        const userId = users[0].id;
        console.log(`✅ Super admin user found with ID: ${userId}`);

        // Check if profile exists
        const [profiles] = await pool.execute(
            'SELECT id FROM super_admins WHERE user_id = ?',
            [userId]
        );

        if (profiles.length === 0) {
            console.log('⚠️  Super admin profile missing. Creating...');
            await pool.execute(
                'INSERT INTO super_admins (user_id, full_name, phone) VALUES (?, ?, ?)',
                [userId, 'Super Administrator', '01700000000']
            );
            console.log('✅ Super admin profile created!');
        } else {
            console.log('✅ Super admin profile exists');
        }

        console.log('\n✅ Super admin is ready to use!');
        console.log('📧 Email: superadmin@mediconnect.com');
        console.log('🔑 Password: password123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAndCreateSuperAdmin();
