const sequelize = require('./config/db');

async function showDoctorList() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Database\n');

        // Get all doctors
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
            ORDER BY id ASC
        `);

        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                            DOCTOR TABLE LIST                               ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

        if (doctors.length === 0) {
            console.log('No doctors found in the database.');
        } else {
            doctors.forEach((doctor, index) => {
                console.log(`${index + 1}. ┌─────────────────────────────────────────────────────────────────────┐`);
                console.log(`   │ ID:              ${String(doctor.id).padEnd(52)}│`);
                console.log(`   │ Name:            ${doctor.full_name.padEnd(52)}│`);
                console.log(`   │ Email:           ${doctor.email.padEnd(52)}│`);
                console.log(`   │ Phone:           ${doctor.phone.padEnd(52)}│`);
                console.log(`   │ City:            ${doctor.city.padEnd(52)}│`);
                console.log(`   │ Specialization:  ${doctor.specialization.padEnd(52)}│`);
                console.log(`   │ Hospital:        ${(doctor.hospital || 'N/A').padEnd(52)}│`);
                console.log(`   │ Visit Fee:       ${(doctor.visit_fee ? doctor.visit_fee + ' BDT' : 'N/A').padEnd(52)}│`);
                console.log(`   │ Created:         ${new Date(doctor.created_at).toLocaleString().padEnd(52)}│`);
                console.log(`   └─────────────────────────────────────────────────────────────────────┘\n`);
            });

            console.log('═'.repeat(80));
            console.log(`✅ Total Doctors: ${doctors.length}`);
            console.log('═'.repeat(80));
        }

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

showDoctorList();
