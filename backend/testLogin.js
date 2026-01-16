const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize('mediconnect', 'root', 'Ullas786.', {
    host: 'localhost',
    port: 3307,
    dialect: 'mysql',
    logging: false
});

async function testLogin() {
    try {
        const email = 'omor.farukh16@gmail.com';
        
        const [results] = await sequelize.query(
            "SELECT id, name, email, password FROM Users WHERE email = ?",
            { replacements: [email] }
        );
        
        if (results.length === 0) {
            console.log('❌ User not found');
            await sequelize.close();
            return;
        }
        
        const user = results[0];
        console.log('✅ User found:', { id: user.id, name: user.name, email: user.email });
        console.log('🔐 Hashed password in DB:', user.password);
        
        // Test with common passwords
        const testPasswords = ['password', '123456', 'test123', 'Password123', 'omor123'];
        
        console.log('\n🧪 Testing common passwords:');
        for (const pwd of testPasswords) {
            const match = await bcrypt.compare(pwd, user.password);
            console.log(`  "${pwd}": ${match ? '✅ MATCH' : '❌ no match'}`);
        }
        
        console.log('\n💡 Enter the password you used during registration to test it.');
        
        await sequelize.close();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testLogin();
