const { Patient } = require('./models');

async function testLogin() {
    try {
        // Test with the most recent patient
        const email = 'omor.farukh16@gmail.com';
        
        console.log('\n🔍 Testing patient login...');
        console.log(`Email: ${email}\n`);
        
        const patient = await Patient.findOne({ where: { email } });
        
        if (!patient) {
            console.log('❌ Patient not found with this email\n');
            process.exit(1);
        }
        
        console.log('✅ Patient found in database:');
        console.log(`   ID: ${patient.id}`);
        console.log(`   Name: ${patient.full_name}`);
        console.log(`   Email: ${patient.email}`);
        console.log(`   Has password: ${patient.password ? 'Yes (encrypted)' : 'No'}`);
        
        // Test password comparison
        const testPassword = '123456'; // Try common test password
        const isValid = await patient.comparePassword(testPassword);
        
        console.log(`\n🔐 Password test with '${testPassword}': ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        
        if (!isValid) {
            console.log('\n💡 Try these common passwords:');
            console.log('   - 123456');
            console.log('   - password');
            console.log('   - Password123');
            console.log('   - Or the password you used during registration\n');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

testLogin();
