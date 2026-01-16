/**
 * Seed script to create sample notifications and reviews for testing
 * Run with: node backend/seedNotificationsAndReviews.js
 */

const db = require('./config/db');
const { User, Doctor, Notification, Review, Appointment } = require('./models');

async function seedData() {
    try {
        console.log('🔄 Connecting to database...');
        await db.authenticate();
        console.log('✅ Database connected');

        // Find test users
        const patient = await User.findOne({ where: { email: 'patient@test.com' } });
        const doctor = await Doctor.findOne({ include: [User] });

        if (!patient || !doctor) {
            console.error('❌ Test users not found. Run seedTestUsers.js first.');
            process.exit(1);
        }

        console.log(`\n👤 Found patient: ${patient.name} (ID: ${patient.id})`);
        console.log(`👨‍⚕️ Found doctor: ${doctor.User.name} (ID: ${doctor.id})\n`);

        // Create sample notifications for the patient
        console.log('📬 Creating sample notifications...');
        
        const notifications = [
            {
                userId: patient.id,
                type: 'APPOINTMENT_CONFIRMED',
                title: 'Appointment Confirmed',
                message: `Your appointment with ${doctor.User.name} has been confirmed for tomorrow at 10:00 AM.`,
                isRead: false
            },
            {
                userId: patient.id,
                type: 'GENERAL',
                title: 'Profile Updated',
                message: 'Your profile information has been successfully updated.',
                isRead: false
            },
            {
                userId: patient.id,
                type: 'PRESCRIPTION_READY',
                title: 'Prescription Ready',
                message: 'Your prescription from Dr. Ahmed is ready to download.',
                isRead: true
            },
            {
                userId: patient.id,
                type: 'APPOINTMENT_REMINDER',
                title: 'Upcoming Appointment',
                message: 'You have an appointment scheduled in 2 hours. Please arrive 15 minutes early.',
                isRead: true
            }
        ];

        for (const notif of notifications) {
            await Notification.create(notif);
            console.log(`  ✅ Created: ${notif.title}`);
        }

        // Create sample reviews for the doctor
        console.log('\n⭐ Creating sample reviews...');

        const reviews = [
            {
                doctorId: doctor.id,
                userId: patient.id,
                appointmentId: null, // Can be null if appointment doesn't exist
                rating: 5,
                comment: 'Excellent doctor! Very professional and caring. Took time to explain everything clearly. Highly recommended!',
                isVerified: true
            },
            {
                doctorId: doctor.id,
                userId: patient.id,
                appointmentId: null,
                rating: 4,
                comment: 'Good experience overall. The doctor was knowledgeable and helpful. Wait time was a bit long but worth it.',
                isVerified: true
            },
            {
                doctorId: doctor.id,
                userId: patient.id,
                appointmentId: null,
                rating: 5,
                comment: 'Best doctor I have consulted! Very thorough examination and great bedside manner. Will definitely visit again.',
                isVerified: true
            },
            {
                doctorId: doctor.id,
                userId: patient.id,
                appointmentId: null,
                rating: 4,
                comment: 'Very professional and experienced. Provided clear treatment plan. Satisfied with the consultation.',
                isVerified: true
            }
        ];

        for (const review of reviews) {
            await Review.create(review);
            console.log(`  ✅ Created review: ${review.rating} stars - "${review.comment.substring(0, 50)}..."`);
        }

        // Update doctor's average rating
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await doctor.update({ rating: avgRating.toFixed(1) });
        console.log(`\n🌟 Updated doctor average rating to: ${avgRating.toFixed(1)}`);

        // Create a sample completed appointment for testing review functionality
        console.log('\n📅 Creating sample completed appointment...');
        
        const completedDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        const dateString = completedDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        
        const completedAppointment = await Appointment.create({
            userId: patient.id,
            doctorId: doctor.id,
            date: dateString,
            time: '10:00 AM',
            type: 'In-Person',
            status: 'COMPLETED',
            queueNumber: 5
        });
        console.log(`  ✅ Created completed appointment (ID: ${completedAppointment.id})`);

        console.log('\n✅ Sample data created successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - ${notifications.length} notifications created`);
        console.log(`   - ${reviews.length} reviews created`);
        console.log(`   - 1 completed appointment created`);
        console.log(`   - Doctor rating updated to ${avgRating.toFixed(1)}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
