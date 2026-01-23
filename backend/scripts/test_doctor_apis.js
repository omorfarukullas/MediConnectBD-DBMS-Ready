/**
 * Test API Endpoints for Doctor Portal
 * Tests appointments and queue endpoints directly
 */

// const fetch = require('node-fetch'); // Native fetch is available in Node 18+

const API_BASE = 'http://localhost:5000/api';

async function testDoctorAPIs() {
    console.log('🧪 Testing Doctor Portal API Endpoints\n');
    console.log('='.repeat(70) + '\n');

    try {
        // First, login to get a token
        console.log('1️⃣ LOGIN TEST');
        console.log('-'.repeat(70));

        const loginRes = await fetch(`${API_BASE}/doctors/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'dee.lockman@gmail.com',
                password: 'password123'
            })
        });

        const loginData = await loginRes.json();
        console.log(`Status: ${loginRes.status}`);

        if (!loginRes.ok) {
            console.log('❌ Login failed:', loginData);
            return;
        }

        console.log('✅ Login successful');
        console.log(`Doctor ID: ${loginData.id}`);
        console.log(`Name: ${loginData.name}`);
        console.log(`Token: ${loginData.token ? loginData.token.substring(0, 20) + '...' : 'MISSING'}`);

        const token = loginData.token;
        const doctorId = loginData.id;

        // Test appointments endpoint
        console.log('\n2️⃣ APPOINTMENTS TEST');
        console.log('-'.repeat(70));

        const apptsRes = await fetch(`${API_BASE}/appointments/my`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status: ${apptsRes.status}`);
        const apptsData = await apptsRes.json();

        if (!apptsRes.ok) {
            console.log('❌ Failed:', apptsData);
        } else {
            const appointments = Array.isArray(apptsData) ? apptsData : (apptsData.data || []);
            console.log(`✅ Success: ${appointments.length} appointments`);
            if (appointments.length > 0) {
                console.log('Sample:', appointments[0]);
            }
        }

        // Test queue endpoint
        console.log('\n3️⃣ QUEUE TEST');
        console.log('-'.repeat(70));

        const queueRes = await fetch(`${API_BASE}/queue/doctor/${doctorId}/today`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status: ${queueRes.status}`);
        const queueData = await queueRes.json();

        if (!queueRes.ok) {
            console.log('❌ Failed:', queueData);
        } else {
            console.log('✅ Success');
            console.log('Response:', JSON.stringify(queueData, null, 2));
        }

        // Test doctors list (should work without auth)
        console.log('\n4️⃣ DOCTORS LIST TEST (no auth)');
        console.log('-'.repeat(70));

        const doctorsRes = await fetch(`${API_BASE}/doctors`);
        console.log(`Status: ${doctorsRes.status}`);
        const doctorsData = await doctorsRes.json();

        if (!doctorsRes.ok) {
            console.log('❌ Failed:', doctorsData);
        } else {
            const doctors = Array.isArray(doctorsData) ? doctorsData : (doctorsData.data || []);
            console.log(`✅ Success: ${doctors.length} doctors`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(70));
        console.log(`Login: ${loginRes.ok ? '✅' : '❌'}`);
        console.log(`Appointments: ${apptsRes.ok ? '✅' : '❌'}`);
        console.log(`Queue: ${queueRes.ok ? '✅' : '❌'}`);
        console.log(`Doctors List: ${doctorsRes.ok ? '✅' : '❌'}`);

        if (loginRes.ok && queueRes.ok) {
            console.log('\n✅ All critical APIs working!');
            console.log('If frontend still fails, issue is in:');
            console.log('  - Frontend making the request correctly');
            console.log('  - Token storage/retrieval');
            console.log('  - CORS or network issues');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testDoctorAPIs();
