const pool = require('./config/db');

async function checkSuperAdmin() {
    try {
        console.log('🔍 Checking for Super Admin accounts...\n');

        // Check all SUPER_ADMIN users
        const [users] = await pool.execute(
            'SELECT id, email, role, is_active, is_verified FROM users WHERE role = "SUPER_ADMIN"'
        );

        console.log(`Found ${users.length} Super Admin accounts:\n`);
        users.forEach((user, index) => {
            console.log(`${index + 1}. Email: ${user.email}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
            console.log(`   Verified: ${user.is_verified ? 'Yes' : 'No'}\n`);
        });

        console.log('\n✅ Use one of these emails with password: password123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkSuperAdmin();
