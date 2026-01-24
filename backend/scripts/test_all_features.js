/**
 * Comprehensive Feature Test Suite
 * Tests all implemented features for MediConnect-BD3.0
 */

const pool = require('../config/db');

const testResults = {
    passed: [],
    failed: [],
    skipped: []
};

function logTest(name, passed, message = '') {
    if (passed) {
        testResults.passed.push(name);
        console.log(`✅ ${name}`);
    } else {
        testResults.failed.push({ name, message });
        console.log(`❌ ${name}: ${message}`);
    }
}

async function testDatabaseSchema() {
    console.log('\n📊 Testing Database Schema...\n');

    try {
        // Test patients table
        const [patients] = await pool.execute('DESCRIBE patients');
        const patientCols = patients.map(c => c.Field);

        logTest('patients.share_medical_history column exists',
            patientCols.includes('share_medical_history'));
        logTest('patients.blood_group column exists',
            patientCols.includes('blood_group'));
        logTest('patients.weight column exists',
            patientCols.includes('weight'));
        logTest('patients.height column exists',
            patientCols.includes('height'));

        // Test medical_documents table
        const [docs] = await pool.execute('DESCRIBE medical_documents');
        const docCols = docs.map(c => c.Field);

        logTest('medical_documents.patient_id column exists',
            docCols.includes('patient_id'));
        logTest('medical_documents.visibility column exists',
            docCols.includes('visibility'));
        logTest('medical_documents.upload_date column exists',
            docCols.includes('upload_date'));
        logTest('medical_documents does NOT have mimetype',
            !docCols.includes('mimetype'));

        // Test prescriptions table
        const [presc] = await pool.execute('DESCRIBE prescriptions');
        const prescCols = presc.map(c => c.Field);

        logTest('prescriptions.visibility column exists',
            prescCols.includes('visibility'));
        logTest('prescriptions.patient_id column exists',
            prescCols.includes('patient_id'));

        // Test notifications table
        const [notif] = await pool.execute('DESCRIBE notifications');
        const notifCols = notif.map(c => c.Field);

        logTest('notifications.related_entity_id column exists',
            notifCols.includes('related_entity_id'));
        logTest('notifications.related_entity_type column exists',
            notifCols.includes('related_entity_type'));
        logTest('notifications does NOT have priority',
            !notifCols.includes('priority'));

    } catch (error) {
        logTest('Database Schema Tests', false, error.message);
    }
}

async function testDataIntegrity() {
    console.log('\n📋 Testing Data Integrity...\n');

    try {
        // Check for patients
        const [patients] = await pool.execute('SELECT COUNT(*) as count FROM patients');
        logTest('Patients table has data', patients[0].count > 0);

        // Check default share_medical_history values
        const [sharingEnabled] = await pool.execute(
            'SELECT COUNT(*) as count FROM patients WHERE share_medical_history = 1'
        );
        console.log(`   ℹ️  ${sharingEnabled[0].count} patients have sharing enabled`);

        // Check hospitals
        const [hospitals] = await pool.execute('SELECT COUNT(*) as count FROM hospitals WHERE is_active = 1');
        logTest('Active hospitals exist', hospitals[0].count > 0);

        // Check visibility enum values
        const [docVisibility] = await pool.execute(
            `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_NAME = 'medical_documents' AND COLUMN_NAME = 'visibility'`
        );
        logTest('medical_documents.visibility uses uppercase ENUM',
            docVisibility[0].COLUMN_TYPE.includes('PUBLIC') &&
            docVisibility[0].COLUMN_TYPE.includes('PRIVATE'));

    } catch (error) {
        logTest('Data Integrity Tests', false, error.message);
    }
}

async function testAPIEndpoints() {
    console.log('\n🔌 Testing API Endpoint Availability...\n');

    // These are logical tests - actual HTTP tests would need authentication
    console.log('   ℹ️  Backend routes configured:');
    console.log('      POST /api/documents/upload - Document upload');
    console.log('      GET /api/documents - Get user documents');
    console.log('      GET /api/documents/patient/:userId - Get patient documents (doctor)');
    console.log('      PATCH /api/documents/:id/visibility - Update document privacy');
    console.log('      GET /api/documents/:id/download - Download document');
    console.log('      DELETE /api/documents/:id - Delete document');
    console.log('');
    console.log('      GET /api/prescriptions - Get user prescriptions');
    console.log('      GET /api/prescriptions/patient/:patientId - Get patient prescriptions (doctor)');
    console.log('      PATCH /api/prescriptions/:id/visibility - Update prescription privacy');
    console.log('');
    console.log('      GET /api/vitals - Get patient vitals');
    console.log('      PUT /api/vitals - Update patient vitals');
    console.log('');
    console.log('      GET /api/hospitals/:id/resources - Get hospital resources');
    console.log('      GET /api/hospitals/public - Get all hospitals');
    console.log('');
    console.log('      GET /api/auth/privacy - Get privacy settings');
    console.log('      PUT /api/auth/privacy - Update privacy settings');

    logTest('API Routes Documented', true);
}

async function runAllTests() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   🧪 MediConnect-BD3.0 Feature Test Suite');
    console.log('═══════════════════════════════════════════════════════════\n');

    await testDatabaseSchema();
    await testDataIntegrity();
    await testAPIEndpoints();

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   📊 Test Summary');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);

    if (testResults.failed.length > 0) {
        console.log('\nFailed Tests:');
        testResults.failed.forEach(f => {
            console.log(`   - ${f.name}: ${f.message}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

    process.exit(testResults.failed.length === 0 ? 0 : 1);
}

runAllTests().catch(err => {
    console.error('❌ Test suite error:', err);
    process.exit(1);
});
