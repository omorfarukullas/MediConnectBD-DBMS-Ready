const { DoctorNew } = require('./models');
const sequelize = require('./config/db');

async function addDoctor() {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Sync the model (create table if not exists)
        await DoctorNew.sync({ alter: true });
        console.log('DoctorNew table synced.');

        // Add the doctor
        const doctor = await DoctorNew.create({
            full_name: 'Dr.Sheikh Mehedi',
            email: 'sheikh.mehedi@salimullah.edu.bd',
            password: 'Doctor@123', // Will be hashed automatically
            phone: '+8801700000001',
            city: 'Dhaka',
            specialization: 'Sex Disease and Skin Specialist',
            hospital: 'Salimullah Medical College',
            visit_fee: 700
        });

        console.log('\n✅ Doctor added successfully!');
        console.log('==========================================');
        console.log('ID:', doctor.id);
        console.log('Name:', doctor.full_name);
        console.log('Email:', doctor.email);
        console.log('Phone:', doctor.phone);
        console.log('City:', doctor.city);
        console.log('Specialization:', doctor.specialization);
        console.log('Hospital:', doctor.hospital);
        console.log('Visit Fee:', doctor.visit_fee, 'BDT');
        console.log('==========================================\n');

        // Fetch all doctors
        const allDoctors = await DoctorNew.findAll({
            attributes: ['id', 'full_name', 'email', 'phone', 'city', 'specialization', 'hospital', 'visit_fee', 'created_at']
        });

        console.log('\n📋 All Doctors in Database:');
        console.log('==========================================');
        allDoctors.forEach((doc, index) => {
            console.log(`\n${index + 1}. ${doc.full_name}`);
            console.log(`   Email: ${doc.email}`);
            console.log(`   Phone: ${doc.phone}`);
            console.log(`   City: ${doc.city}`);
            console.log(`   Specialization: ${doc.specialization}`);
            console.log(`   Hospital: ${doc.hospital || 'N/A'}`);
            console.log(`   Visit Fee: ${doc.visit_fee || 'N/A'} BDT`);
            console.log(`   Created: ${doc.created_at}`);
        });
        console.log('==========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding doctor:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addDoctor();
