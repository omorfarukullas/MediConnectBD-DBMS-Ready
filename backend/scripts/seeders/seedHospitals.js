const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');

/**
 * Seed Hospitals Table
 * Creates hospitals with resources, departments, tests, and ambulances
 */
async function seedHospitals(count = 10) {
    console.log('🌱 Seeding hospitals...');

    const cities = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'];
    const types = ['Public', 'Private', 'Diagnostic'];
    const hospitalNames = [
        'Square Hospital', 'Apollo Hospital', 'United Hospital', 'Evercare Hospital',
        'Labaid Hospital', 'Popular Diagnostic', 'Ibn Sina Hospital', 'Delta Medical',
        'Central Hospital', 'Trust Medical', 'Care Hospital', 'Green Life Hospital',
        'Farazy Hospital', 'Comfort Hospital', 'New Life Medical'
    ];

    // Generate all possible unique combinations
    const uniqueCombinations = [];
    for (const name of hospitalNames) {
        for (const city of cities) {
            uniqueCombinations.push({ name, city });
        }
    }

    // Shuffle combinations to get random selection
    const shuffled = faker.helpers.shuffle(uniqueCombinations);

    // Take as many as needed (max available)
    const selectedHospitals = shuffled.slice(0, Math.min(count, uniqueCombinations.length));

    const hospitalIds = [];

    for (const combo of selectedHospitals) {
        const hospital = {
            name: `${combo.name} ${combo.city}`,
            address: faker.location.streetAddress() + ', ' + combo.city,
            city: combo.city,
            type: faker.helpers.arrayElement(types),
            contact_phone: '+880' + faker.string.numeric(10),
            contact_email: faker.internet.email().toLowerCase(),
            license_number: 'LIC-' + faker.string.alphanumeric({ length: 8, casing: 'upper' }),
            is_approved: faker.datatype.boolean(0.75), // 75% approved
            is_active: true
        };

        let hospitalId;

        try {
            const [result] = await pool.execute(
                `INSERT INTO hospitals (name, address, city, type, contact_phone, contact_email, license_number, is_approved, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [hospital.name, hospital.address, hospital.city, hospital.type,
                hospital.contact_phone, hospital.contact_email, hospital.license_number,
                hospital.is_approved, hospital.is_active]
            );
            hospitalId = result.insertId;
            hospitalIds.push(hospitalId);
        } catch (error) {
            console.error(`Error inserting hospital ${hospital.name}:`, error.message);
            throw error;
        }

        // Seed hospital resources
        const resourceTypes = ['ICU', 'CCU', 'CABIN', 'GENERAL_WARD'];
        for (const resourceType of resourceTypes) {
            let totalCapacity, available;

            if (resourceType === 'ICU' || resourceType === 'CCU') {
                totalCapacity = faker.number.int({ min: 10, max: 30 });
                available = faker.number.int({ min: 0, max: totalCapacity });
            } else if (resourceType === 'CABIN') {
                totalCapacity = faker.number.int({ min: 20, max: 50 });
                available = faker.number.int({ min: 0, max: totalCapacity });
            } else { // GENERAL_WARD
                totalCapacity = faker.number.int({ min: 50, max: 200 });
                available = faker.number.int({ min: 0, max: totalCapacity });
            }

            await pool.execute(
                `INSERT INTO hospital_resources (hospital_id, resource_type, total_capacity, available)
                 VALUES (?, ?, ?, ?)`,
                [hospitalId, resourceType, totalCapacity, available]
            );
        }

        // Seed departments
        const departments = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
            'General Medicine', 'Dermatology', 'Gastroenterology'];
        for (const deptName of departments) {
            const [deptResult] = await pool.execute(
                `INSERT INTO departments (hospital_id, name, description, is_active)
                 VALUES (?, ?, ?, ?)`,
                [hospitalId, deptName, faker.lorem.sentence(), true]
            );

            // Seed tests for department
            const testCount = faker.number.int({ min: 3, max: 8 });
            const testNames = {
                'Cardiology': ['ECG', 'Echocardiogram', 'Stress Test', 'Holter Monitor'],
                'Neurology': ['MRI Brain', 'CT Scan', 'EEG', 'EMG'],
                'Orthopedics': ['X-Ray', 'Bone Density Test', 'MRI Joint', 'CT Scan'],
                'Pediatrics': ['Growth Assessment', 'Vaccination', 'Blood Test', 'Vision Test'],
                'General Medicine': ['Complete Blood Count', 'Liver Function', 'Kidney Function', 'Thyroid Test'],
                'Dermatology': ['Skin Biopsy', 'Allergy Test', 'Patch Test'],
                'Gastroenterology': ['Endoscopy', 'Colonoscopy', 'Ultrasound Abdomen']
            };

            const deptTests = testNames[deptName] || ['General Test'];

            for (let j = 0; j < Math.min(testCount, deptTests.length); j++) {
                await pool.execute(
                    `INSERT INTO tests (department_id, name, description, cost, duration_minutes, is_available)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [deptResult.insertId,
                    deptTests[j],
                    faker.lorem.sentence(),
                    faker.number.float({ min: 500, max: 10000, fractionDigits: 2 }),
                    faker.number.int({ min: 15, max: 120 }),
                        true]
                );
            }
        }

        // Seed ambulances
        const ambulanceCount = faker.number.int({ min: 2, max: 6 });
        for (let j = 0; j < ambulanceCount; j++) {
            await pool.execute(
                `INSERT INTO ambulances (hospital_id, vehicle_number, driver_name, driver_phone, ambulance_type, status, current_location)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [hospitalId,
                    combo.city.substring(0, 3).toUpperCase() + '-' + faker.string.alphanumeric({ length: 6, casing: 'upper' }),
                    faker.person.fullName(),
                    '+880' + faker.string.numeric(10),
                    faker.helpers.arrayElement(['BASIC', 'ADVANCED', 'ICU']),
                    faker.helpers.arrayElement(['AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'BUSY', 'MAINTENANCE']), // More likely to be available
                    faker.location.streetAddress() + ', ' + hospital.city]
            );
        }
    }

    console.log(`✅ Created ${count} hospitals with resources, departments, tests, and ambulances`);
    return hospitalIds;
}

module.exports = seedHospitals;
