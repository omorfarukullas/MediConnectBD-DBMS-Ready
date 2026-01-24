const { faker } = require('@faker-js/faker');
const pool = require('../../config/db');

/**
 * Seed Medical Documents and Prescriptions
 * Creates medical records with privacy controls
 */
async function seedMedicalRecords() {
    console.log('🌱 Seeding medical records...');

    // Get all patients
    const [patients] = await pool.execute('SELECT id FROM patients LIMIT 60');
    const [doctors] = await pool.execute('SELECT id FROM doctors');
    const [completedAppointments] = await pool.execute(
        'SELECT id, patient_id, doctor_id FROM appointments WHERE status = "COMPLETED" LIMIT 100'
    );

    const documentTypes = ['LAB_REPORT', 'PRESCRIPTION', 'XRAY', 'SCAN', 'OTHER'];
    const visibilities = ['PUBLIC', 'PUBLIC', 'PUBLIC', 'PRIVATE']; // 75% public

    // Create medical documents
    let docCount = 0;
    for (const patient of patients) {
        const numDocs = faker.number.int({ min: 1, max: 5 });

        for (let i = 0; i < numDocs; i++) {
            const documentType = faker.helpers.arrayElement(documentTypes);
            const visibility = faker.helpers.arrayElement(visibilities);
            const doctor = faker.helpers.arrayElement(doctors);

            let filename;
            if (documentType === 'LAB_REPORT') {
                filename = `lab_report_${faker.string.alphanumeric(8)}.pdf`;
            } else if (documentType === 'XRAY') {
                filename = `xray_${faker.string.alphanumeric(8)}.jpg`;
            } else if (documentType === 'SCAN') {
                filename = `scan_${faker.string.alphanumeric(8)}.jpg`;
            } else {
                filename = `document_${faker.string.alphanumeric(8)}.pdf`;
            }

            // Use path format that matches documentController: 'uploads/filename' (no leading slash)
            await pool.execute(
                `INSERT INTO medical_documents (patient_id, filename, filepath, document_type, description, visibility, uploaded_by_doctor_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [patient.id, filename, `uploads/documents/${filename}`, documentType,
                faker.lorem.sentence(), visibility, doctor.id]
            );
            docCount++;
        }
    }

    // Create prescriptions from completed appointments
    let prescCount = 0;
    for (const appointment of completedAppointments) {
        if (faker.datatype.boolean(0.7)) { // 70% of completed appointments have prescriptions
            const numMeds = faker.number.int({ min: 1, max: 4 });

            for (let i = 0; i < numMeds; i++) {
                const medications = [
                    'Paracetamol', 'Amoxicillin', 'Azithromycin', 'Omeprazole',
                    'Metformin', 'Aspirin', 'Atorvastatin', 'Losartan',
                    'Ciprofloxacin', 'Cetirizine', 'Ranitidine', 'Fluconazole'
                ];

                const medication = faker.helpers.arrayElement(medications);
                const dosages = ['500mg', '250mg', '100mg', '50mg', '25mg', '10mg'];
                const frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'As needed'];
                const durations = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days'];
                const visibility = faker.helpers.arrayElement(visibilities);

                await pool.execute(
                    `INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, medication_name, dosage, frequency, duration, instructions, visibility)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [appointment.patient_id, appointment.doctor_id, appointment.id, medication,
                    faker.helpers.arrayElement(dosages), faker.helpers.arrayElement(frequencies),
                    faker.helpers.arrayElement(durations), faker.lorem.sentence(), visibility]
                );
                prescCount++;
            }
        }
    }

    console.log(`✅ Created ${docCount} medical documents and ${prescCount} prescriptions`);
}

module.exports = seedMedicalRecords;
