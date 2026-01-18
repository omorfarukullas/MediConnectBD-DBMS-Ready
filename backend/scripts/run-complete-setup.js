const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'mediconnect',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true
});

async function setupDatabase() {
    try {
        console.log('🔐 Hashing password "Ullas786"...');
        const hashedPassword = await bcrypt.hash('Ullas786', 10);
        console.log(`✅ Password hashed: ${hashedPassword.substring(0, 20)}...`);
        
        console.log('\n📄 Reading SQL file...');
        let sql = await fs.readFile('./complete-setup.sql', 'utf8');
        
        console.log('🔄 Replacing password placeholder...');
        sql = sql.replaceAll('HASHED_PASSWORD_HERE', hashedPassword);
        
        console.log('\n🚀 Executing SQL setup...');
        await pool.query(sql);
        
        console.log('\n✅ Database setup completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   ✓ Created telemedicine_sessions table');
        console.log('   ✓ Created doctor_earnings table');
        console.log('   ✓ Inserted 7 new patients (Mehedi, Umar, Ullas, Rayan, Pranto, Emon, Tuhin)');
        console.log('   ✓ Inserted vitals for all 8 patients');
        console.log('   ✓ Created today\'s appointments (5 patients)');
        console.log('   ✓ Created tomorrow\'s appointments (3 patients)');
        console.log('   ✓ Created past completed appointments (5 patients)');
        console.log('   ✓ Inserted 5 reviews for completed appointments');
        console.log('   ✓ Calculated earnings for Dr.Test');
        console.log('   ✓ Created telemedicine session records\n');
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.error(error);
        await pool.end();
        process.exit(1);
    }
}

setupDatabase();
