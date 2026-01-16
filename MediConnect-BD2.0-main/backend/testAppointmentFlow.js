const { Patient, DoctorNew, AppointmentNew } = require('./models');

async function testAppointmentFlow() {
    try {
        console.log('\n========================================');
        console.log('   TESTING APPOINTMENT BOOKING FLOW');
        console.log('========================================\n');

        // 1. Find a patient
        const patient = await Patient.findOne({ where: { email: 'omor.farukh16@gmail.com' } });
        if (!patient) {
            console.log('❌ Test patient not found');
            process.exit(1);
        }
        console.log(`✅ Patient found: ${patient.full_name} (ID: ${patient.id})`);

        // 2. Find a doctor
        const doctor = await DoctorNew.findOne();
        if (!doctor) {
            console.log('❌ No doctors in database');
            process.exit(1);
        }
        console.log(`✅ Doctor found: ${doctor.full_name} (ID: ${doctor.id})`);

        // 3. Create test appointment
        const testDate = new Date();
        testDate.setDate(testDate.getDate() + 1); // Tomorrow
        
        const appointment = await AppointmentNew.create({
            patient_id: patient.id,
            doctor_id: doctor.id,
            appointment_date: testDate.toISOString().split('T')[0],
            appointment_time: '10:00:00',
            reason_for_visit: 'Test appointment from debug script',
            status: 'PENDING'
        });
        
        console.log(`✅ Appointment created: ID ${appointment.id}`);
        console.log(`   Date: ${appointment.appointment_date}`);
        console.log(`   Time: ${appointment.appointment_time}`);
        console.log(`   Status: ${appointment.status}`);

        // 4. Fetch with joins
        const fullAppointment = await AppointmentNew.findByPk(appointment.id, {
            include: [
                { model: Patient, as: 'patient', attributes: ['id', 'full_name', 'email'] },
                { model: DoctorNew, as: 'doctor', attributes: ['id', 'full_name', 'specialization'] }
            ]
        });

        console.log(`\n✅ Fetched with joins:`);
        console.log(`   Patient: ${fullAppointment.patient.full_name}`);
        console.log(`   Doctor: ${fullAppointment.doctor.full_name}`);
        console.log(`   Specialization: ${fullAppointment.doctor.specialization}`);

        // 5. Get all appointments for this patient
        const patientAppointments = await AppointmentNew.findAll({
            where: { patient_id: patient.id },
            include: [
                { model: DoctorNew, as: 'doctor', attributes: ['id', 'full_name', 'specialization'] }
            ],
            order: [['appointment_date', 'DESC']]
        });

        console.log(`\n✅ Total appointments for ${patient.full_name}: ${patientAppointments.length}`);
        patientAppointments.forEach((apt, index) => {
            console.log(`   ${index + 1}. Dr. ${apt.doctor.full_name} - ${apt.appointment_date} ${apt.appointment_time} [${apt.status}]`);
        });

        console.log('\n========================================');
        console.log('   ✅ ALL TESTS PASSED!');
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testAppointmentFlow();
