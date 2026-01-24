const pool = require('../config/db');

async function updateAdminHospital() {
    const adminEmail = 'nicola_harvey41@hotmail.com';
    const targetHospitalName = 'Trust Medical Rajshahi';

    try {
        console.log('🔍 Finding hospital and admin...');

        // 1. Find the target hospital
        const [hospitals] = await pool.execute(
            'SELECT id, name, city FROM hospitals WHERE name LIKE ?',
            [`%${targetHospitalName}%`]
        );

        if (hospitals.length === 0) {
            console.log('❌ Hospital not found. Available hospitals:');
            const [all] = await pool.execute('SELECT name FROM hospitals ORDER BY name LIMIT 20');
            all.forEach(h => console.log(`   - ${h.name}`));
            process.exit(1);
        }

        const hospital = hospitals[0];
        console.log(`✅ Found hospital: ${hospital.name} (ID: ${hospital.id})`);

        // 2. Find the admin user
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [adminEmail]
        );

        if (users.length === 0) {
            console.log(`❌ User not found: ${adminEmail}`);
            process.exit(1);
        }

        const userId = users[0].id;
        console.log(`✅ Found user: ${adminEmail} (ID: ${userId})`);

        // 3. Check if hospital_admins record exists
        const [existing] = await pool.execute(
            'SELECT id, hospital_id FROM hospital_admins WHERE user_id = ?',
            [userId]
        );

        if (existing.length > 0) {
            // Update existing record
            const [result] = await pool.execute(
                'UPDATE hospital_admins SET hospital_id = ? WHERE user_id = ?',
                [hospital.id, userId]
            );
            console.log(`✅ Updated existing admin record to hospital: ${hospital.name}`);
        } else {
            // Create new admin profile
            const [result] = await pool.execute(
                'INSERT INTO hospital_admins (user_id, hospital_id, full_name, phone, designation) VALUES (?, ?, ?, ?, ?)',
                [userId, hospital.id, 'Hospital Administrator', '+8801700000000', 'Administrator']
            );
            console.log(`✅ Created new admin profile for hospital: ${hospital.name}`);
        }

        // 4. Verify the update
        const [verify] = await pool.execute(`
            SELECT u.email, h.name as hospital_name, h.city, h.id as hospital_id
            FROM users u
            JOIN hospital_admins ha ON u.id = ha.user_id
            JOIN hospitals h ON ha.hospital_id = h.id
            WHERE u.email = ?
        `, [adminEmail]);

        if (verify.length > 0) {
            console.log('\n📋 Updated Admin Details:');
            console.log(`   Email:       ${verify[0].email}`);
            console.log(`   Hospital:    ${verify[0].hospital_name}`);
            console.log(`   Hospital ID: ${verify[0].hospital_id}`);
            console.log(`   City:        ${verify[0].city}`);
            console.log(`   Password:    password123`);
        }

        console.log('\n✅ Update complete! Admin can now access Trust Medical Rajshahi resources.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

updateAdminHospital();
