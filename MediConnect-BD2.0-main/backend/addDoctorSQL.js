const sequelize = require('./config/db');
const bcrypt = require('bcryptjs');

async function addDoctorDirectSQL() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to MySQL Database on port 3307\n');

        // Hash the password first
        const hashedPassword = await bcrypt.hash('Doctor@123', 10);

        // Direct SQL INSERT query
        const insertQuery = `
            INSERT INTO doctors 
            (full_name, email, password, phone, city, specialization, hospital, visit_fee, created_at, updated_at)
            VALUES 
            ('Dr. Tohidul Islam Shanto', 'dr.shanto@dhakamed.edu.bd', '${hashedPassword}', '+8801700000000', 'Dhaka', 'Orthopedics', 'Dhaka Medical College', 1000.00, NOW(), NOW())
        `;

        console.log('📝 Executing SQL Query:');
        console.log('='.repeat(100));
        console.log(`INSERT INTO doctors`);
        console.log(`(full_name, email, password, phone, city, specialization, hospital, visit_fee, created_at, updated_at)`);
        console.log(`VALUES`);
        console.log(`('Dr. Tohidul Islam Shanto', 'dr.shanto@dhakamed.edu.bd', '[HASHED_PASSWORD]',`);
        console.log(` '+8801700000000', 'Dhaka', 'Orthopedics', 'Dhaka Medical College', 1000.00, NOW(), NOW());`);
        console.log('='.repeat(100));

        // Execute the query
        const [result] = await sequelize.query(insertQuery);
        
        console.log('\n✅ INSERT Query Executed Successfully!');
        console.log(`   Inserted ID: ${result}`);
        console.log(`   Rows Affected: 1\n`);

        // Verify the insertion with SELECT query
        console.log('🔍 Verifying with SELECT Query:');
        console.log('='.repeat(100));
        console.log(`SELECT * FROM doctors WHERE id = ${result};`);
        console.log('='.repeat(100));

        const [doctors] = await sequelize.query(`
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
            WHERE id = ${result}
        `);

        if (doctors.length > 0) {
            const doctor = doctors[0];
            console.log('\n✅ Doctor Successfully Added to Database:');
            console.log('┌─────────────────────────────────────────────────────────────────────────┐');
            console.log(`│ ID:              ${doctor.id.toString().padEnd(58)}│`);
            console.log(`│ Full Name:       ${doctor.full_name.padEnd(58)}│`);
            console.log(`│ Email:           ${doctor.email.padEnd(58)}│`);
            console.log(`│ Phone:           ${doctor.phone.padEnd(58)}│`);
            console.log(`│ City:            ${doctor.city.padEnd(58)}│`);
            console.log(`│ Specialization:  ${doctor.specialization.padEnd(58)}│`);
            console.log(`│ Hospital:        ${doctor.hospital.padEnd(58)}│`);
            console.log(`│ Visit Fee:       ${(doctor.visit_fee + ' BDT').padEnd(58)}│`);
            console.log(`│ Created At:      ${doctor.created_at.toString().padEnd(58)}│`);
            console.log('└─────────────────────────────────────────────────────────────────────────┘');
        }

        // Show all doctors in table format
        const [allDoctors] = await sequelize.query(`
            SELECT 
                id,
                full_name,
                specialization,
                hospital,
                CONCAT(visit_fee, ' BDT') as visit_fee,
                city
            FROM doctors
            ORDER BY id DESC
        `);

        console.log('\n\n📊 All Doctors in Database (Proof Database is Working):');
        console.log('='.repeat(100));
        console.table(allDoctors);
        console.log('='.repeat(100));
        console.log(`✅ Total Doctors in Database: ${allDoctors.length}`);
        console.log(`✅ Database is WORKING PROPERLY! ✅\n`);

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addDoctorDirectSQL();
