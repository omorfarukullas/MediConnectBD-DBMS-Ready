const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupTestDoctor() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'mediconnect'
    });

    try {
        console.log('👨‍⚕️ Setting up test doctor account...\n');
        
        // Check existing doctors
        const [doctors] = await connection.execute(
            'SELECT id, email FROM doctors LIMIT 5'
        );
        
        console.log('Existing doctors:');
        doctors.forEach(d => console.log(`  ID: ${d.id}, Email: ${d.email}`));
        
        if (doctors.length > 0) {
            const testDoctorId = doctors[0].id;
            const testEmail = doctors[0].email;
            
            console.log(`\n📝 Updating password for doctor ID ${testDoctorId}...`);
            
            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('test123', salt);
            
            // Update in users table (assuming doctor credentials are in users table with role DOCTOR)
            await connection.execute(
                'UPDATE users SET password = ? WHERE email = ? AND role = ?',
                [hashedPassword, testEmail, 'DOCTOR']
            );
            
            console.log('✅ Password updated to: test123');
            console.log(`\nℹ️ Test credentials:`);
            console.log(`   Email: ${testEmail}`);
            console.log(`   Password: test123`);
            console.log(`   Doctor ID: ${testDoctorId}`);
        } else {
            console.log('\n❌ No doctors found. Please register a doctor first.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

setupTestDoctor();
