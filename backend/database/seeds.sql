-- ============================================
-- MediConnect BD - Seed Data
-- Database: MySQL 8.0+
-- Date: January 2026
-- ============================================

-- Disable FK checks for bulk inserts
SET FOREIGN_KEY_CHECKS = 0;

-- Optional: Truncate tables before seeding
TRUNCATE TABLE doctor_earnings;
TRUNCATE TABLE telemedicine_sessions;
TRUNCATE TABLE appointment_queue;
TRUNCATE TABLE doctor_slots;
TRUNCATE TABLE reviews;
TRUNCATE TABLE prescriptions;
TRUNCATE TABLE medical_documents;
TRUNCATE TABLE patient_vitals;
TRUNCATE TABLE doctor_schedules;
TRUNCATE TABLE appointments;
TRUNCATE TABLE doctors;
TRUNCATE TABLE patients;
TRUNCATE TABLE hospitals;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 1. Insert Doctors
-- ============================================
-- Password hash: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy (password123)

INSERT INTO doctors (id, full_name, email, password, phone, city, specialization, consultation_fee, bio) VALUES
(1, 'Dr. Emily Chen', 'emily.chen@hospital.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0201', 'New York', 'Cardiologist', 100.00, 'Expert in heart rhythm disorders'),
(2, 'Dr. Robert Martinez', 'robert.martinez@hospital.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0202', 'Los Angeles', 'Dermatologist', 80.00, 'Specialist in cosmetic dermatology'),
(3, 'Dr. Lisa Anderson', 'lisa.anderson@hospital.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0203', 'Chicago', 'Pediatrician', 90.00, 'Dedicated to child healthcare'),
(4, 'Dr. Test Doctor', 'test@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+880-1700-000000', 'Dhaka', 'General Physician', 500.00, 'Experienced General Practitioner')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- ============================================
-- 2. Insert Patients
-- ============================================

INSERT INTO patients (id, full_name, email, password, phone, address, blood_group) VALUES
(1, 'John Smith', 'john.smith@email.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0101', '123 Main St, New York, NY', 'O+'),
(2, 'Sarah Johnson', 'sarah.johnson@email.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0102', '456 Oak Ave, Los Angeles, CA', 'A-'),
(3, 'Michael Williams', 'michael.williams@email.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0103', '789 Pine Rd, Chicago, IL', 'B+'),
(4, 'Sonnet', 'sonnet@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+880-1700-000001', 'Dhaka', 'A+'),
(5, 'Mehedi', 'mehedi@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+880-1700-000002', 'Dhaka', 'AB+'),
(6, 'Umar', 'umar@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+880-1700-000003', 'Dhaka', 'O+'),
(7, 'Ullas', 'ullas@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+880-1700-000004', 'Dhaka', 'A-'),
(8, 'Rayan', 'rayan@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+880-1700-000005', 'Dhaka', 'B+')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- ============================================
-- 3. Insert Vitals
-- ============================================

INSERT INTO patient_vitals (user_id, blood_group, height, weight, blood_pressure, heart_rate, allergies) VALUES
(4, 'A+', 175.00, 75.00, '120/80', 72, 'None'),
(5, 'AB+', 170.00, 68.00, '118/78', 70, 'Penicillin'), 
(6, 'O+', 178.00, 82.00, '125/82', 75, 'None'),
(7, 'A-', 172.00, 70.00, '122/80', 73, 'Dust'),
(8, 'B+', 180.00, 85.00, '130/85', 78, 'None')
ON DUPLICATE KEY UPDATE height=VALUES(height);

-- ============================================
-- 4. Doctor Slots (for Dr. Test - ID 4)
-- ============================================

INSERT INTO doctor_slots (doctor_id, slot_date, slot_start_time, slot_end_time, appointment_type, max_appointments)
SELECT 
    4 AS doctor_id,
    DATE_ADD(CURDATE(), INTERVAL n DAY) AS slot_date,
    '10:00:00' AS slot_start_time,
    '14:00:00' AS slot_end_time,
    'physical' AS appointment_type,
    10 AS max_appointments
FROM (
    SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 
    UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
) numbers
WHERE NOT EXISTS (SELECT 1 FROM doctor_slots WHERE doctor_id = 4 LIMIT 1);

INSERT INTO doctor_slots (doctor_id, slot_date, slot_start_time, slot_end_time, appointment_type, max_appointments)
SELECT 
    4 AS doctor_id,
    DATE_ADD(CURDATE(), INTERVAL n DAY) AS slot_date,
    '15:00:00' AS slot_start_time,
    '18:00:00' AS slot_end_time,
    'telemedicine' AS appointment_type,
    5 AS max_appointments
FROM (
    SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 
    UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
) numbers
WHERE NOT EXISTS (SELECT 1 FROM doctor_slots WHERE doctor_id = 4 AND appointment_type = 'telemedicine' LIMIT 1);

-- ============================================
-- 5. Appointments
-- ============================================

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason_for_visit, consultation_type) VALUES
(4, 4, CURDATE(), '09:00:00', 'ACCEPTED', 'Regular checkup', 'In-Person'),
(5, 4, CURDATE(), '09:30:00', 'ACCEPTED', 'Fever and cough', 'In-Person'),
(6, 4, CURDATE(), '10:00:00', 'ACCEPTED', 'Blood pressure monitoring', 'In-Person'),
(1, 1, '2026-01-20', '10:00:00', 'PENDING', 'Annual cardiac checkup', 'In-Person');

-- ============================================
-- 6. Medical Documents (Samples)
-- ============================================

INSERT INTO medical_documents (user_id, filename, filepath, mimetype, size, document_type, description, visibility) VALUES
(4, 'blood_test.pdf', '/uploads/blood_test.pdf', 'application/pdf', 245680, 'LAB_REPORT', 'Complete Blood Count', 'public'),
(5, 'xray.pdf', '/uploads/xray.pdf', 'application/pdf', 512340, 'XRAY', 'Chest X-Ray', 'private');

