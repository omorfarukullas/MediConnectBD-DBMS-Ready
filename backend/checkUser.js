const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('mediconnect', 'root', 'Ullas786.', {
    host: 'localhost',
    port: 3307,
    dialect: 'mysql',
    logging: false
});

async function checkUser() {
    try {
        const [results] = await sequelize.query(
            "SELECT id, name, email, role, SUBSTRING(password, 1, 30) as password_hash FROM Users WHERE email = 'omor.farukh16@gmail.com'"
        );
        
        if (results.length > 0) {
            console.log('✅ User found in database:');
            console.log(JSON.stringify(results[0], null, 2));
        } else {
            console.log('❌ No user found with email: omor.farukh16@gmail.com');
            
            // Check if any users exist
            const [allUsers] = await sequelize.query("SELECT id, email FROM Users LIMIT 5");
            console.log('\n📋 Sample users in database:');
            console.log(allUsers);
        }
        
        await sequelize.close();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkUser();
