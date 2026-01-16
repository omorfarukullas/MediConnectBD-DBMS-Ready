const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize('mediconnect', 'root', 'Ullas786.', {
    host: 'localhost',
    port: 3307,
    dialect: 'mysql',
    logging: false
});

async function resetPassword() {
    try {
        const email = 'omor.farukh16@gmail.com';
        const newPassword = 'Ullas786.';
        
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update the password
        await sequelize.query(
            "UPDATE Users SET password = ? WHERE email = ?",
            { replacements: [hashedPassword, email] }
        );
        
        console.log('✅ Password reset successfully!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔐 New Password: ${newPassword}`);
        console.log('\n✅ You can now login with these credentials.');
        
        await sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetPassword();
