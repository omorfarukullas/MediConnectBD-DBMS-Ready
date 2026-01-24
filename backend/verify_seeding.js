const pool = require('./config/db');

(async () => {
    try {
        console.log('\n📊 DATABASE SEEDING VERIFICATION\n');
        console.log('='.repeat(70));

        // Get counts from all major tables
        const tables = [
            'users',
            'patients',
            'doctors',
            'hospital_admins',
            'super_admins',
            'hospitals',
            'hospital_resources',
            'departments',
            'tests',
            'ambulances',
            'appointments',
            'appointment_queue',
            'doctor_slots',
            'medical_documents',
            'prescriptions',
            'doctor_earnings',
            'reviews'
        ];

        console.log('📋 Table Counts:\n');

        for (const table of tables) {
            const [result] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
            const count = result[0].count;
            const icon = count > 0 ? '✅' : '⚠️ ';
            console.log(`   ${icon} ${table.padEnd(25)} : ${count}`);
        }

        // Sample data from key tables
        console.log('\n' + '='.repeat(70));
        console.log('👥 Sample Users:\n');

        const [users] = await pool.execute(`
            SELECT u.email, u.role 
            FROM users u 
            WHERE u.role IN ('PATIENT', 'DOCTOR', 'HOSPITAL_ADMIN', 'SUPER_ADMIN')
            ORDER BY u.role, u.id
            LIMIT 10
        `);

        const grouped = {};
        users.forEach(u => {
            if (!grouped[u.role]) grouped[u.role] = [];
            grouped[u.role].push(u.email);
        });

        Object.keys(grouped).forEach(role => {
            console.log(`   ${role}:`);
            grouped[role].slice(0, 2).forEach(email => {
                console.log(`      - ${email}`);
            });
        });

        // Check appointment dates
        console.log('\n' + '='.repeat(70));
        console.log('📅 Appointment Date Distribution:\n');

        const [dates] = await pool.execute(`
            SELECT 
                DATE(appointment_date) as date,
                COUNT(*) as count
            FROM appointments
            GROUP BY DATE(appointment_date)
            ORDER BY date
            LIMIT 10
        `);

        const today = new Date().toISOString().split('T')[0];
        dates.forEach(d => {
            const dateStr = d.date.toISOString().split('T')[0];
            const isToday = dateStr === today ? ' ← TODAY' : '';
            console.log(`   ${dateStr}: ${d.count} appointments${isToday}`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('🔑 Test Login Credentials:\n');
        console.log('   Super Admin:');
        console.log('      Email: superadmin@mediconnect.com');
        console.log('      Password: password123\n');
        console.log('   Note: All users have password "password123"');
        console.log('='.repeat(70) + '\n');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
})();
