-- ============================================
-- Doctor-Patient Appointment System Schema
-- Database: MySQL 5.7+ / PostgreSQL 12+
-- Author: Senior Database Architect
-- Date: January 12, 2026
-- ============================================

-- Drop tables if they exist (for clean re-runs)
-- Note: Disable foreign key checks temporarily to allow dropping tables
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- Table: patients
-- Description: Stores patient account information
-- ============================================
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL COMMENT 'Hashed password using bcrypt',
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_email_format CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: doctors
-- Description: Stores doctor profiles with searchable fields
-- ============================================
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL COMMENT 'Hashed password using bcrypt',
    phone VARCHAR(20),
    city VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL COMMENT 'e.g., Cardiologist, Dermatologist, Pediatrician',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_doctor_email_format CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    
    -- Indices for optimized search (City, Specialization, Name)
    INDEX idx_city (city),
    INDEX idx_specialization (specialization),
    INDEX idx_full_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: appointments
-- Description: Links patients to doctors with scheduling logic
-- ============================================
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason_for_visit TEXT,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_appointment_patient 
        FOREIGN KEY (patient_id) REFERENCES patients(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    CONSTRAINT fk_appointment_doctor 
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    -- Unique constraint to prevent double booking (Doctor + Date + Time)
    CONSTRAINT uq_doctor_datetime 
        UNIQUE (doctor_id, appointment_date, appointment_time),
    
    -- Indices for query optimization
    INDEX idx_patient_id (patient_id),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Sample Data Inserts
-- ============================================

-- Insert 3 Patients
INSERT INTO patients (full_name, email, password, phone, address) VALUES
('John Smith', 'john.smith@email.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0101', '123 Main St, New York, NY 10001'),
('Sarah Johnson', 'sarah.johnson@email.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0102', '456 Oak Ave, Los Angeles, CA 90001'),
('Michael Williams', 'michael.williams@email.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0103', '789 Pine Rd, Chicago, IL 60601');

-- Insert 3 Doctors
INSERT INTO doctors (full_name, email, password, phone, city, specialization) VALUES
('Dr. Emily Chen', 'emily.chen@hospital.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0201', 'New York', 'Cardiologist'),
('Dr. Robert Martinez', 'robert.martinez@hospital.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0202', 'Los Angeles', 'Dermatologist'),
('Dr. Lisa Anderson', 'lisa.anderson@hospital.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+1-555-0203', 'Chicago', 'Pediatrician');

-- Insert 3 Appointments (demonstrating the flow)
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit, status) VALUES
(1, 1, '2026-01-20', '10:00:00', 'Annual cardiac checkup', 'PENDING'),
(2, 2, '2026-01-21', '14:30:00', 'Skin rash consultation', 'ACCEPTED'),
(3, 3, '2026-01-22', '09:00:00', 'Child vaccination', 'COMPLETED');

-- ============================================
-- Example Search Queries (for demonstration)
-- ============================================

-- Search doctors by city
-- SELECT * FROM doctors WHERE city = 'New York';

-- Search doctors by specialization
-- SELECT * FROM doctors WHERE specialization = 'Cardiologist';

-- Search doctors by name (partial match)
-- SELECT * FROM doctors WHERE full_name LIKE '%Chen%';

-- Get all appointments for a specific patient
-- SELECT a.*, d.full_name AS doctor_name, d.specialization 
-- FROM appointments a 
-- JOIN doctors d ON a.doctor_id = d.id 
-- WHERE a.patient_id = 1;

-- Get all appointments for a specific doctor on a specific date
-- SELECT a.*, p.full_name AS patient_name 
-- FROM appointments a 
-- JOIN patients p ON a.patient_id = p.id 
-- WHERE a.doctor_id = 1 AND a.appointment_date = '2026-01-20';

-- Check for double booking attempts
-- SELECT * FROM appointments 
-- WHERE doctor_id = 1 
-- AND appointment_date = '2026-01-20' 
-- AND appointment_time = '10:00:00';
