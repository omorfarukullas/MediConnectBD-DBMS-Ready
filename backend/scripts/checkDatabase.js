const pool = require('../config/db');

async function checkDatabase() {
    try {
        const [users] = await pool.execute('SELECT role, COUNT(*) as count FROM users GROUP BY role');
        console.log('\n📊 Database User Statistics:');
        if (users.length === 0) {
            console.log('❌ No users found in database!\n');
            console.log('💡 Run the seeder to populate the database:');
            console.log('   npm run seed\n');
        } else {
            users.forEach(u => console.log(`   ${u.role}: ${u.count}`));
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

checkDatabase();
