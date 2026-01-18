const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'mediconnect',
            multipleStatements: true
        });

        console.log('✅ Connected to database');

        // Hash password for all patients
        const password = 'Ullas786';
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🔒 Password hashed:', hashedPassword.substring(0, 20) + '...');

        // Read and modify SQL file
        let sql = fs.readFileSync(path.join(__dirname, 'setup_complete_data.sql'), 'utf8');
        
        // Replace placeholder hash with real hash
        sql = sql.replace(/\$2a\$10\$zQxYvK5fKjYxVz9HxJN5dOKvK5fKjYxVz9HxJN5dO/g, hashedPassword);

        console.log('📝 Executing database setup...');
        await connection.query(sql);

        console.log('✅ Database setup completed successfully!');
        console.log('\n📊 Summary:');
        console.log('- 8 patients added (Sonnet, Mehedi, Umar, Ullas, Rayan, Pranto, Emon, Tuhin)');
        console.log('- Password for all: Ullas786');
        console.log('- Vitals table created');
        console.log('- Appointments created (today, tomorrow, past)');
        console.log('- Reviews added');
        console.log('- Telemedicine sessions created');
        console.log('- Earnings records added');
        
        await connection.end();
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setupDatabase();
