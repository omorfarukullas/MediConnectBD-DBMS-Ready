const pool = require('../config/db');

async function testAdminAuth() {
    const adminEmail = 'nicola_harvey41@hotmail.com';

    try {
        console.log('=================================================');
        console.log('TESTING ADMIN AUTHENTICATION & DATA ACCESS');
        console.log('=================================================\n');

        // Simulate the auth middleware flow
        console.log('1. Finding user by email...');
        const [users] = await pool.execute(
            'SELECT id, email, role, is_active FROM users WHERE email = ?',
            [adminEmail]
        );

        if (users.length === 0) {
            console.log('❌ User not found');
            process.exit(1);
        }

        const user = users[0];
        console.log(`✅ User found: ID ${user.id}, Role: ${user.role}`);

        // Get admin profile (simulating auth middleware)
        console.log('\n2. Fetching admin profile...');
        const [admins] = await pool.execute(
            'SELECT id as profile_id, full_name as name, phone, hospital_id, designation FROM hospital_admins WHERE user_id = ?',
            [user.id]
        );

        if (admins.length === 0) {
            console.log('❌ Admin profile not found');
            process.exit(1);
        }

        const profileData = admins[0];
        console.log(`✅ Admin profile found: Hospital ID ${profileData.hospital_id}`);

        // Simulate req.user
        const reqUser = {
            id: user.id,
            email: user.email,
            role: user.role,
            ...profileData
        };

        console.log('\n3. req.user object (what controller receives):');
        console.log(JSON.stringify(reqUser, null, 2));

        // Test hospital details fetch (simulating getHospitalDetails)
        console.log('\n4. Fetching hospital details...');
        const [hospitals] = await pool.execute(
            'SELECT * FROM hospitals WHERE id = ?',
            [reqUser.hospital_id]
        );

        if (hospitals.length > 0) {
            console.log('✅ Hospital details:');
            console.log(`   Name: ${hospitals[0].name}`);
            console.log(`   City: ${hospitals[0].city}`);
            console.log(`   Type: ${hospitals[0].type}`);
        }

        // Test resources fetch
        console.log('\n5. Fetching hospital resources...');
        const [resources] = await pool.execute(
            'SELECT * FROM hospital_resources WHERE hospital_id = ?',
            [reqUser.hospital_id]
        );

        console.log(`✅ Found ${resources.length} resource types:`);
        resources.forEach(r => {
            console.log(`   - ${r.resource_type}: ${r.available}/${r.total_capacity} available`);
        });

        console.log('\n=================================================');
        console.log('✅ ALL AUTHENTICATION & DATA ACCESS WORKING!');
        console.log('=================================================');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testAdminAuth();
