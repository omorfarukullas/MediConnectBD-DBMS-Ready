const axios = require('axios');

async function testDoctorAPI() {
    try {
        console.log('Testing Doctor API Endpoints...\n');
        console.log('='.repeat(80));

        // Test GET all doctors
        console.log('\n📡 Testing: GET http://localhost:5000/api/v2/doctors\n');
        
        const response = await axios.get('http://localhost:5000/api/v2/doctors');
        
        console.log('✅ API Response:');
        console.log('─'.repeat(80));
        console.log(`Status: ${response.status}`);
        console.log(`Total Doctors: ${response.data.count}`);
        console.log('─'.repeat(80));
        
        console.log('\n📋 Doctor List from API:\n');
        response.data.doctors.forEach((doctor, index) => {
            console.log(`${index + 1}. ${doctor.full_name}`);
            console.log(`   ID: ${doctor.id}`);
            console.log(`   Email: ${doctor.email}`);
            console.log(`   Phone: ${doctor.phone}`);
            console.log(`   City: ${doctor.city}`);
            console.log(`   Specialization: ${doctor.specialization}`);
            console.log(`   Hospital: ${doctor.hospital || 'N/A'}`);
            console.log(`   Visit Fee: ${doctor.visit_fee ? doctor.visit_fee + ' BDT' : 'N/A'}`);
            console.log('');
        });

        console.log('='.repeat(80));
        console.log('✅ API is working! Doctors are accessible via HTTP endpoint.');
        console.log('='.repeat(80));

        // Check if Dr. Shanto is in the list
        const drShanto = response.data.doctors.find(d => d.full_name === 'Dr. Tohidul Islam Shanto');
        if (drShanto) {
            console.log('\n🎯 Dr. Tohidul Islam Shanto FOUND in API response!');
            console.log('─'.repeat(80));
            console.log(JSON.stringify(drShanto, null, 2));
            console.log('─'.repeat(80));
        } else {
            console.log('\n❌ Dr. Tohidul Islam Shanto NOT found in API response!');
        }

    } catch (error) {
        console.error('❌ API Test Failed!');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Message: ${error.response.data.message || error.message}`);
        } else if (error.request) {
            console.error('No response received from server.');
            console.error('Make sure the server is running on http://localhost:5000');
        } else {
            console.error('Error:', error.message);
        }
    }
}

testDoctorAPI();
