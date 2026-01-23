const pool = require('../config/db');

async function debugDoctorUser() {
    console.log('🔍 Debugging Doctor User\n');

    try {
        const email = 'test@gmail.com';

        // 1. Check doctor record
        console.log(`Checking doctor with email: ${email}`);
        const [doctors] = await pool.query('SELECT * FROM doctors WHERE email = ?', [email]);

        if (doctors.length === 0) {
            console.log('❌ Doctor not found in doctors table');
            return;
        }

        const doctor = doctors[0];
        console.log('✅ Doctor found:', {
            id: doctor.id,
            name: doctor.full_name,
            email: doctor.email,
            user_id: doctor.user_id || 'NULL' // Check if user_id links to users table
        });

        // 2. Check linked user record if user_id exists (Wait, earlier schema check said users table exists)
        // Let's check if there is a users table entry for this email first
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.log('❌ No user found in users table with this email');
            if (!doctor.user_id) {
                console.log('⚠️  And doctor record has no user_id reference. Login relies on users table!');
            }
        } else {
            console.log('✅ User found in users table:', {
                id: users[0].id,
                email: users[0].email,
                role: users[0].role,
                password_hash_exists: !!users[0].password
            });
        }

        // 3. If doctor has user_id, check that specific user
        if (doctor.user_id) {
            const [linkedUser] = await pool.query('SELECT * FROM users WHERE id = ?', [doctor.user_id]);
            if (linkedUser.length > 0) {
                console.log('✅ Linked user found via doctor.user_id:', {
                    id: linkedUser[0].id,
                    email: linkedUser[0].email,
                    role: linkedUser[0].role
                });
            } else {
                console.log('❌ Linked user ID exists in doctors table but not found in users table');
            }
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
    }
}

debugDoctorUser();
