const sequelize = require('./config/db');

async function viewDoctorInDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to MySQL Database\n');

        // Execute raw SQL query
        const [results] = await sequelize.query(`
            SELECT 
                id,
                full_name,
                email,
                phone,
                city,
                specialization,
                hospital,
                visit_fee,
                created_at
            FROM doctors
            WHERE full_name = 'Dr. Tohidul Islam Shanto'
        `);

        console.log('🔍 Direct Database Query Result:');
        console.log('='.repeat(80));
        console.log('SQL Query: SELECT * FROM doctors WHERE full_name = "Dr. Tohidul Islam Shanto"');
        console.log('='.repeat(80));
        
        if (results.length > 0) {
            const doctor = results[0];
            console.log('\n📋 Doctor Record Found:');
            console.log('-'.repeat(80));
            console.log(`ID:              ${doctor.id}`);
            console.log(`Full Name:       ${doctor.full_name}`);
            console.log(`Email:           ${doctor.email}`);
            console.log(`Phone:           ${doctor.phone}`);
            console.log(`City:            ${doctor.city}`);
            console.log(`Specialization:  ${doctor.specialization}`);
            console.log(`Hospital:        ${doctor.hospital}`);
            console.log(`Visit Fee:       ${doctor.visit_fee} BDT`);
            console.log(`Created At:      ${doctor.created_at}`);
            console.log('-'.repeat(80));
        } else {
            console.log('\n❌ No doctor found with that name.');
        }

        // Show all doctors
        const [allDoctors] = await sequelize.query(`
            SELECT 
                id,
                full_name,
                specialization,
                hospital,
                visit_fee,
                city
            FROM doctors
            ORDER BY id DESC
        `);

        console.log('\n\n📊 All Doctors in Database:');
        console.log('='.repeat(80));
        console.table(allDoctors);
        console.log('='.repeat(80));
        console.log(`\nTotal Doctors: ${allDoctors.length}`);

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

viewDoctorInDatabase();
