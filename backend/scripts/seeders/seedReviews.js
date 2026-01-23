const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');

/**
 * Seed Reviews Table
 * Creates patient reviews for completed appointments
 */
async function seedReviews(appointmentIds) {
    console.log('🌱 Seeding reviews...');

    // Get completed appointments
    const [completedAppointments] = await pool.execute(
        'SELECT id, patient_id, doctor_id FROM appointments WHERE status = "COMPLETED"'
    );

    let reviewCount = 0;
    for (const appointment of completedAppointments) {
        // 60% of completed appointments get reviews
        if (faker.datatype.boolean(0.6)) {
            const rating = faker.helpers.weightedArrayElement([
                { weight: 5, value: 5 },
                { weight: 20, value: 4 },
                { weight: 10, value: 3 },
                { weight: 3, value: 2 },
                { weight: 1, value: 1 }
            ]); // Weighted towards positive reviews

            const comments = {
                5: [
                    'Excellent doctor! Very caring and professional.',
                    'Highly recommended. Great experience.',
                    'Very satisfied with the treatment.',
                    'Best doctor I have consulted with.'
                ],
                4: [
                    'Good doctor, very helpful.',
                    'Professional service.',
                    'Satisfied with the consultation.',
                    'Would recommend to others.'
                ],
                3: [
                    'Average experience.',
                    'Decent consultation.',
                    'Service was okay.'
                ],
                2: [
                    'Expected better service.',
                    'Not very satisfied.',
                    'Could be improved.'
                ],
                1: [
                    'Very disappointed.',
                    'Poor service.',
                    'Would not recommend.'
                ]
            };

            const comment = faker.helpers.arrayElement(comments[rating]);

            await pool.execute(
                `INSERT INTO reviews (patient_id, doctor_id, appointment_id, rating, comment, is_verified)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [appointment.patient_id, appointment.doctor_id, appointment.id, rating, comment, true]
            );
            reviewCount++;
        }
    }

    console.log(`✅ Created ${reviewCount} reviews`);
}

module.exports = seedReviews;
