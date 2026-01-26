
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const TODAY = '2026-01-27'; // Fixed date as per user context
const TOMORROW = '2026-01-28';
const YESTERDAY = '2026-01-26';

async function seedFull() {
    console.log('🌱 Starting Full System Seed...');

    try {
        // --- 1. CLEANUP (Optional - comment out to append instead) ---
        // console.log('🧹 Cleaning old data...');
        // await pool.execute('DELETE FROM reviews');
        // await pool.execute('DELETE FROM appointment_queue');
        // await pool.execute('DELETE FROM appointments');
        // await pool.execute('DELETE FROM prescriptions');
        // await pool.execute('DELETE FROM doctors');
        // await pool.execute('DELETE FROM patients');
        // await pool.execute('DELETE FROM users');

        // For safety, we will just ADD data, not delete, to preserve existing login if possible.
        // Actually, to ensure "seeds all data" implies a fresh state, but resetting users might break the logged-in user.
        // I'll check if specific users exist, if not create them.

        // --- 2. USERS & PROFILES ---
        console.log('👤 Seeding Users...');
        const hashedPassword = await bcrypt.hash('123456', 10);

        // Check/Create Admin
        let [admins] = await pool.execute('SELECT id FROM users WHERE email = ?', ['admin@mediconnect.com']);
        if (admins.length === 0) {
            await pool.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
                ['admin@mediconnect.com', hashedPassword, 'ADMIN']);
        }

        // Check/Create Patient
        let patientId;
        let [patients] = await pool.execute('SELECT id FROM users WHERE email = ?', ['patient@test.com']);

        let userId;
        if (patients.length === 0) {
            const [res] = await pool.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
                ['patient@test.com', hashedPassword, 'PATIENT']);
            userId = res.insertId;
        } else {
            userId = patients[0].id;
        }

        // Check for patient profile
        const [pProfile] = await pool.execute('SELECT id FROM patients WHERE user_id = ?', [userId]);
        if (pProfile.length === 0) {
            const [res] = await pool.execute('INSERT INTO patients (user_id, full_name, phone, blood_group) VALUES (?, ?, ?, ?)',
                [userId, 'John Doe', '01700000000', 'O+']);
            patientId = res.insertId;
        } else {
            patientId = pProfile[0].id;
        }

        // Check/Create Doctor
        let doctorId;
        let docsUserId;
        let [docs] = await pool.execute('SELECT id FROM users WHERE email = ?', ['doctor@test.com']);

        if (docs.length === 0) {
            const [res] = await pool.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
                ['doctor@test.com', hashedPassword, 'DOCTOR']);
            docsUserId = res.insertId;
        } else {
            docsUserId = docs[0].id;
        }

        // Check for doctor profile
        const [dProfile] = await pool.execute('SELECT id FROM doctors WHERE user_id = ?', [docsUserId]);
        if (dProfile.length === 0) {
            const [dRes] = await pool.execute(`INSERT INTO doctors 
                (user_id, full_name, phone, specialization, bmdc_number, experience_years, consultation_fee, rating, bio, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [docsUserId, 'Dr. Sarah Smith', '01800000000', 'Cardiology', 'A-99999', 10, 1500, 4.8, 'Expert Cardiologist', 'Active']);
            doctorId = dRes.insertId;
        } else {
            doctorId = dProfile[0].id;
        }

        console.log(`✅ Users ready. Patient ID: ${patientId}, Doctor ID: ${doctorId}`);

        // --- 3. APPOINTMENTS (Past, Today, Future) ---
        console.log('📅 Seeding Appointments...');

        // Past Appointment (Completed)
        await pool.execute(`INSERT INTO appointments 
            (doctor_id, patient_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit, created_at, updated_at)
            VALUES (?, ?, ?, '09:00:00', 'PHYSICAL', 'COMPLETED', 'Regular Checkup - Past', NOW(), NOW())`,
            [doctorId, patientId, YESTERDAY]);

        // Today's Appointment (Confirmed - for Live Queue)
        // Check if exists first to avoid duplicates from previous seed
        const [todayApts] = await pool.execute('SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?', [doctorId, TODAY, '11:00:00']);
        if (todayApts.length === 0) {
            const [res] = await pool.execute(`INSERT INTO appointments 
                (doctor_id, patient_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit, created_at, updated_at)
                VALUES (?, ?, ?, '11:00:00', 'TELEMEDICINE', 'CONFIRMED', 'Emergency Consult - Today', NOW(), NOW())`,
                [doctorId, patientId, TODAY]);

            // Add to Queue
            await pool.execute(`INSERT INTO appointment_queue 
                (appointment_id, doctor_id, patient_id, queue_number, queue_date, status, created_at, updated_at)
                VALUES (?, ?, ?, 3, ?, 'WAITING', NOW(), NOW())`,
                [res.insertId, doctorId, patientId, TODAY]);
        }

        // Future Appointment (Pending)
        await pool.execute(`INSERT INTO appointments 
            (doctor_id, patient_id, appointment_date, appointment_time, consultation_type, status, reason_for_visit, created_at, updated_at)
            VALUES (?, ?, ?, '14:00:00', 'PHYSICAL', 'PENDING', 'Follow up - Future', NOW(), NOW())`,
            [doctorId, patientId, TOMORROW]);

        // --- 4. REVIEWS ---
        console.log('⭐ Seeding Reviews...');
        // Review for the past appointment (randomized)
        // Find a completed appointment without review
        const [completedApts] = await pool.execute('SELECT id FROM appointments WHERE status = "COMPLETED" AND doctor_id = ? LIMIT 1', [doctorId]);
        if (completedApts.length > 0) {
            const aptId = completedApts[0].id;
            // Check if review exists
            const [revs] = await pool.execute('SELECT id FROM reviews WHERE appointment_id = ?', [aptId]);
            if (revs.length === 0) {
                await pool.execute(`INSERT INTO reviews 
                    (patient_id, doctor_id, rating, comment, appointment_id, is_verified, created_at)
                    VALUES (?, ?, 5, 'Excellent doctor, very patient!', ?, 1, NOW())`,
                    [patientId, doctorId, aptId]);
                console.log('   Added review for past appointment.');
            }
        }

        // --- 5. HOSPITAL RESOURCES ---
        console.log('🏥 Seeding Resources...');
        // Ensure some resources exist
        const [resources] = await pool.execute('SELECT id FROM hospital_resources LIMIT 1');
        if (resources.length === 0) {
            await pool.execute(`INSERT INTO hospital_resources (resource_type, total_capacity, available) VALUES 
                ('ICU', 20, 5),
                ('CCU', 15, 8),
                ('GENERAL_WARD', 100, 45),
                ('CABIN', 50, 12)`);
        }

        // --- 6. AMBULANCES ---
        const [ambulances] = await pool.execute('SELECT id FROM ambulances LIMIT 1');
        if (ambulances.length === 0) {
            await pool.execute(`INSERT INTO ambulances (vehicle_number, driver_name, driver_phone, ambulance_type, status) VALUES 
                ('DHAKA-METRO-KA-1234', 'Rahim Uddin', '01711111111', 'ICU', 'AVAILABLE'),
                ('DHAKA-METRO-KH-5678', 'Karim Mia', '01722222222', 'BASIC', 'BUSY')`);
        }

        // --- 7. DEPARTMENTS & TESTS ---
        const [depts] = await pool.execute('SELECT id FROM departments LIMIT 1');
        if (depts.length === 0) {
            await pool.execute(`INSERT INTO departments (name, description, is_active) VALUES 
                ('Cardiology', 'Heart related diseases', 1),
                ('Neurology', 'Brain and nerves', 1),
                ('Orthopedics', 'Bones and joints', 1)`);

            // Add tests for first dept
            const [dId] = await pool.execute('SELECT id FROM departments LIMIT 1');
            await pool.execute(`INSERT INTO tests (department_id, name, description, cost, duration_minutes, is_available) VALUES 
                (?, 'ECG', 'Electrocardiogram', 500, 15, 1),
                (?, 'Echocardiogram', 'Heart Ultrasound', 2500, 45, 1)`, [dId[0].id, dId[0].id]);
        }

        console.log('✅ FULL SEED COMPLETE!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Seeding Error:', err);
        process.exit(1);
    }
}

seedFull();
