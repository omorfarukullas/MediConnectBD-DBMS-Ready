const pool = require('../config/db');

async function inspectHospitalData() {
    try {
        console.log('=================================================');
        console.log('HOSPITAL RESOURCES INVESTIGATION');
        console.log('=================================================\n');

        // 1. Check hospital details
        const [hospital] = await pool.execute(
            'SELECT * FROM hospitals WHERE id = 30001'
        );
        console.log('1. HOSPITAL DETAILS:');
        console.log(JSON.stringify(hospital[0], null, 2));

        // 2. Check hospital resources
        const [resources] = await pool.execute(
            'SELECT * FROM hospital_resources WHERE hospital_id = 30001'
        );
        console.log('\n2. HOSPITAL RESOURCES IN DATABASE:');
        console.log(`Found ${resources.length} resource types`);
        resources.forEach(r => {
            console.log(`  - Type: ${r.resource_type}, Total: ${r.total_capacity}, Available: ${r.available}`);
        });

        // 3. Check what the API returns
        const [adminUser] = await pool.execute(
            'SELECT u.id, ha.hospital_id FROM users u JOIN hospital_admins ha ON u.id = ha.user_id WHERE u.email = ?',
            ['nicola_harvey41@hotmail.com']
        );

        console.log('\n3. ADMIN USER INFO:');
        console.log(`  User ID: ${adminUser[0].id}, Hospital ID: ${adminUser[0].hospital_id}`);

        console.log('\n=================================================');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

inspectHospitalData();
