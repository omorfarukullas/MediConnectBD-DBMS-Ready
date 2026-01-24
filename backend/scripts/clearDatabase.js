const pool = require('../config/db');

/**
 * Clear all data from database tables
 * Respects foreign key constraints by deleting in correct order
 */
async function clearDatabase() {
    console.log('🗑️  Starting database cleanup...\n');

    try {
        // Disable foreign key checks temporarily
        await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

        // List of tables to clear (in order to respect dependencies)
        const tables = [
            'reviews',
            'doctor_earnings',
            'prescriptions',
            'medical_documents',
            'appointment_queue',
            'appointments',
            'doctor_slots',
            'ambulances',
            'tests',
            'departments',
            'hospital_resources',
            'doctors',
            'patients',
            'hospital_admins',
            'super_admins',
            'hospitals',
            'users',
            'notifications'
        ];

        console.log('Clearing tables:');
        console.log('-'.repeat(60));

        for (const table of tables) {
            try {
                const [result] = await pool.execute(`DELETE FROM ${table}`);
                console.log(`✓ Cleared ${table.padEnd(25)} (${result.affectedRows || 0} rows)`);
            } catch (error) {
                console.log(`⚠ Skipped ${table.padEnd(25)} (${error.message})`);
            }
        }

        // Reset auto-increment counters to proper starting values (entity code system)
        // Different ranges distinguish entity types: patients=20k, hospitals=30k, doctors=40k, etc.
        console.log('\nRestoring auto-increment code ranges...');
        const autoIncrements = {
            'users': 1000,
            'patients': 20001,
            'hospitals': 30001,
            'doctors': 40001,
            'hospital_admins': 50001,
            'super_admins': 60001,
            'hospital_resources': 70001,
            'departments': 80001,
            'ambulances': 90001,
            'appointments': 100001,
            'doctor_slots': 110001,
            'appointment_queue': 120001,
            'medical_documents': 130001,
            'prescriptions': 140001,
            'doctor_earnings': 150001,
            'reviews': 160001,
            'tests': 170001
        };

        for (const [table, startValue] of Object.entries(autoIncrements)) {
            try {
                await pool.execute(`ALTER TABLE ${table} AUTO_INCREMENT = ${startValue}`);
                console.log(`  ✓ ${table.padEnd(25)} → starts at ${startValue}`);
            } catch (error) {
                // Ignore errors for tables that might not exist
            }
        }

        // Re-enable foreign key checks
        await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n' + '='.repeat(60));
        console.log('✅ Database cleared successfully!\n');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error clearing database:', error.message);
        await pool.end();
        process.exit(1);
    }
}

clearDatabase();
