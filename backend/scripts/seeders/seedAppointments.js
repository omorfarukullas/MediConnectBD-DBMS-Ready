const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');

/**
 * Seed Appointments Table
 * Creates appointments between patients and doctors
 */
async function seedAppointments() {
    console.log('🌱 Seeding appointments...');

    // Get all patients and doctors
    const [patients] = await pool.execute('SELECT id FROM patients LIMIT 80'); // Use subset for realistic appointments
    const [doctors] = await pool.execute('SELECT id, consultation_fee FROM doctors');

    const appointmentIds = [];
    const consultationTypes = ['PHYSICAL', 'TELEMEDICINE'];
    const statuses = ['PENDING', 'CONFIRMED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED']; // More likely to be confirmed/completed

    // Generate appointments for the past month and next month
    for (const patient of patients) {
        const numAppointments = faker.number.int({ min: 1, max: 4 });

        for (let i = 0; i < numAppointments; i++) {
            const doctor = faker.helpers.arrayElement(doctors);
            const consultationType = faker.helpers.arrayElement(consultationTypes);
            const status = faker.helpers.arrayElement(statuses);

            // Generate date within last 30 days or next 30 days
            const appointmentDate = faker.date.between({
                from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            // Random time between 9 AM and 5 PM
            const hours = faker.number.int({ min: 9, max: 16 });
            const minutes = faker.helpers.arrayElement([0, 15, 30, 45]);
            const appointmentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

            const started_at = status === 'IN_PROGRESS' || status === 'COMPLETED' ?
                new Date(appointmentDate.getTime() + hours * 60 * 60 * 1000) : null;
            const completed_at = status === 'COMPLETED' ?
                new Date(appointmentDate.getTime() + (hours + 1) * 60 * 60 * 1000) : null;

            const [result] = await pool.execute(
                `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit, started_at, completed_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [patient.id, doctor.id, appointmentDate.toISOString().split('T')[0], appointmentTime,
                    consultationType, status, faker.lorem.sentence(), started_at, completed_at]
            );

            appointmentIds.push(result.insertId);

            // Create queue entry if appointment is in progress or completed
            if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
                const queueStatus = status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';
                const queueNumber = faker.number.int({ min: 1, max: 50 });

                await pool.execute(
                    `INSERT INTO appointment_queue (appointment_id, doctor_id, patient_id, queue_number, queue_date, status, called_at, started_at, completed_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [result.insertId, doctor.id, patient.id, queueNumber, appointmentDate.toISOString().split('T')[0],
                        queueStatus, started_at, started_at, completed_at]
                );
            }

            // Create earnings record if appointment is completed
            if (status === 'COMPLETED') {
                await pool.execute(
                    `INSERT INTO doctor_earnings (doctor_id, appointment_id, patient_id, amount, consultation_type, payment_status, earned_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [doctor.id, result.insertId, patient.id, doctor.consultation_fee, consultationType, 'COMPLETED', appointmentDate.toISOString().split('T')[0]]
                );
            }
        }
    }

    console.log(`✅ Created ${appointmentIds.length} appointments with queue entries and earnings`);
    return appointmentIds;
}

module.exports = seedAppointments;
