-- SQL Query to view Dr. Tohidul Islam Shanto in the database
-- Run this query directly in MySQL to see the doctor record

-- View the specific doctor
SELECT 
    id,
    full_name,
    email,
    phone,
    city,
    specialization,
    hospital,
    visit_fee,
    created_at,
    updated_at
FROM doctors
WHERE full_name = 'Dr. Tohidul Islam Shanto';

-- View all doctors
SELECT 
    id,
    full_name,
    email,
    city,
    specialization,
    hospital,
    visit_fee
FROM doctors
ORDER BY id DESC;

-- Raw INSERT query that was executed (for reference)
-- This is what Sequelize executed behind the scenes:
/*
INSERT INTO doctors (
    full_name, 
    email, 
    password, 
    phone, 
    city, 
    specialization, 
    hospital, 
    visit_fee, 
    created_at, 
    updated_at
) VALUES (
    'Dr. Tohidul Islam Shanto',
    'dr.shanto@dhakamed.edu.bd',
    '$2a$10$[hashed_password]',
    '+8801700000000',
    'Dhaka',
    'Orthopedics',
    'Dhaka Medical College',
    1000.00,
    NOW(),
    NOW()
);
*/
