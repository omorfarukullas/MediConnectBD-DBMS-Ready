const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');

/**
 * Seed Doctors Table
 * Creates doctor profiles and assigns them to hospitals
 */
async function seedDoctors(hospitalIds) {
    console.log('🌱 Seeding doctors...');

    // Get all users with DOCTOR role
    const [users] = await pool.execute(
        'SELECT id FROM users WHERE role = "DOCTOR"'
    );

    const specializations = [
        'Cardiologist', 'Neurologist', 'Orthop edic Surgeon', 'Pediatrician',
        'General Physician', 'Dermatologist', 'Gastroenterologist', 'Psychiatrist',
        'ENT Specialist', 'Ophthalmologist', 'Gynecologist', 'Urologist'
    ];

    const qualifications = [
        'MBBS, MD', 'MBBS, FCPS', 'MBBS, FRCS', 'MBBS, MS',
        'MBBS, MRCP', 'MBBS, DCH', 'MBBS, DDV', 'MBBS, DGO'
    ];

    for (const user of users) {
        const specialization = faker.helpers.arrayElement(specializations);
        const doctor = {
            user_id: user.id,
            full_name: 'Dr. ' + faker.person.fullName(),
            phone: '+880' + faker.string.numeric(10),
            specialization: specialization,
            qualification: faker.helpers.arrayElement(qualifications),
            bmdc_number: 'A-' + faker.string.numeric(5),
            experience_years: faker.number.int({ min: 2, max: 30 }),
            consultation_fee: faker.helpers.arrayElement([500, 800, 1000, 1200, 1500, 2000]),
            bio: `Experienced ${specialization} with expertise in treating various conditions. Committed to providing quality healthcare.`,
            hospital_id: faker.helpers.arrayElement(hospitalIds) // Assign to random hospital
        };

        await pool.execute(
            `INSERT INTO doctors (user_id, full_name, phone, specialization, qualification, bmdc_number, experience_years, consultation_fee, bio, hospital_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [doctor.user_id, doctor.full_name, doctor.phone, doctor.specialization,
            doctor.qualification, doctor.bmdc_number, doctor.experience_years,
            doctor.consultation_fee, doctor.bio, doctor.hospital_id]
        );
    }

    console.log(`✅ Created ${users.length} doctor profiles`);
}

module.exports = seedDoctors;
