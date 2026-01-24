const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');

/**
 * Seed Appointments Table
 * Creates appointments between patients and doctors
 */
async function seedAppointments() {
    console.log('🌱 Seeding appointments...');

    // Get all patients and doctors
    const [patients] = await pool.execute('SELECT id FROM patients LIMIT 80');
    // Get doctors with their slots to ensure we book valid sessions
    const [doctors] = await pool.execute('SELECT id, consultation_fee FROM doctors');

    const appointmentIds = [];
    const consultationTypes = ['PHYSICAL', 'TELEMEDICINE'];

    // Cache slots for each doctor to avoid repeated queries
    const doctorSlotsMap = new Map();

    // Helper to get slots for a doctor
    const getDoctorSlots = async (doctorId) => {
        if (doctorSlotsMap.has(doctorId)) return doctorSlotsMap.get(doctorId);
        const [slots] = await pool.execute(
            'SELECT day_of_week, start_time, end_time, consultation_type FROM doctor_slots WHERE doctor_id = ? AND is_active = 1',
            [doctorId]
        );
        doctorSlotsMap.set(doctorId, slots);
        return slots;
    };

    // Helper to days name
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    console.log(`   Fetched ${patients.length} patients and ${doctors.length} doctors. Generating appointments...`);

    // Generate appointments with realistic distribution
    // IMPORTANT: Reduced from 1-4 to 0-2 to ensure slots don't always show full
    // This creates varied availability: some empty, some partial, rarely full
    for (const patient of patients) {
        // Each patient gets 0-2 appointments (weighted towards 1)
        const rand = Math.random();
        let numAppointments;
        if (rand < 0.2) numAppointments = 0;  // 20% no appointments
        else if (rand < 0.7) numAppointments = 1;  // 50% one appointment
        else numAppointments = 2;  // 30% two appointments

        for (let i = 0; i < numAppointments; i++) {
            const doctor = faker.helpers.arrayElement(doctors);
            const slots = await getDoctorSlots(doctor.id);

            if (slots.length === 0) continue; // Skip if doctor has no slots

            // Try to find a matching date for a random slot
            const slot = faker.helpers.arrayElement(slots);

            // Find a date within range that matches the slot's day_of_week
            let appointmentDate = null;
            let attempts = 0;

            while (!appointmentDate && attempts < 10) {
                const randomDate = faker.date.between({
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });

                const dayName = days[randomDate.getDay()];
                if (dayName === slot.day_of_week) {
                    appointmentDate = randomDate;
                }
                attempts++;
            }

            if (!appointmentDate) continue; // Couldn't match date to slot

            // CRITICAL FIX: Set appointment_time to SESSION START TIME
            // The slotController counts bookings by grouping on (date, appointment_time)
            // So we must match the slot's start_time exactly.
            const appointmentTime = slot.start_time;

            const consultationType = slot.consultation_type === 'BOTH'
                ? faker.helpers.arrayElement(consultationTypes)
                : slot.consultation_type;

            // Determine status
            const now = new Date();
            const isPast = appointmentDate < now;
            let status = isPast
                ? faker.helpers.arrayElement(['COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'])
                : faker.helpers.arrayElement(['CONFIRMED', 'CONFIRMED', 'PENDING']);

            const started_at = status === 'IN_PROGRESS' || status === 'COMPLETED' ?
                new Date(appointmentDate.getTime() + 9 * 60 * 60 * 1000) : null; // Just simplified time logic
            const completed_at = status === 'COMPLETED' ?
                new Date(appointmentDate.getTime() + 10 * 60 * 60 * 1000) : null;

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
