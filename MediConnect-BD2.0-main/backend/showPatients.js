const { Patient } = require('./models');

async function showPatients() {
    try {
        const patients = await Patient.findAll({
            attributes: ['id', 'full_name', 'email', 'phone', 'created_at'],
            order: [['created_at', 'DESC']],
            raw: true
        });

        console.log('\n========================================');
        console.log('   REGISTERED PATIENTS');
        console.log('========================================\n');

        if (patients.length === 0) {
            console.log('❌ No patients registered yet.\n');
        } else {
            console.log(`✅ Total Patients: ${patients.length}\n`);
            
            patients.forEach((patient, index) => {
                console.log(`${index + 1}. ${patient.full_name}`);
                console.log(`   ID: ${patient.id}`);
                console.log(`   Email: ${patient.email}`);
                console.log(`   Phone: ${patient.phone || 'Not provided'}`);
                console.log(`   Registered: ${new Date(patient.created_at).toLocaleString()}`);
                console.log('   ---');
            });
        }

        console.log('========================================\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fetching patients:', error.message);
        process.exit(1);
    }
}

showPatients();
