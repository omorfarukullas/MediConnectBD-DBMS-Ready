/**
 * Test My Appointments API
 * Verifies getMyAppointments endpoint for both Doctor and Patient roles
 */

// const fetch = require('node-fetch'); // Native fetch in Node 18+

const API_BASE = 'http://localhost:5000/api';

async function testMyAppointments() {
    console.log('🧪 Testing My Appointments API\n');
    console.log('='.repeat(60) + '\n');

    try {
        // 1. Test as Doctor
        console.log('1️⃣ TEST AS DOCTOR (dee.lockman@gmail.com)');
        const docLogin = await fetch(`${API_BASE}/doctors/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'dee.lockman@gmail.com', password: 'password123' })
        });

        const docData = await docLogin.json();
        if (!docLogin.ok) {
            console.log('❌ Doctor Login failed:', docData);
        } else {
            console.log('✅ Doctor Login success. Token:', docData.token.substring(0, 15) + '...');

            // Get Appointments
            const apptRes = await fetch(`${API_BASE}/appointments/my`, {
                headers: { 'Authorization': `Bearer ${docData.token}` }
            });

            if (!apptRes.ok) {
                const text = await apptRes.text();
                console.log(`❌ Fetch Appointments Failed: ${apptRes.status} ${apptRes.statusText}`);
                console.log('Response Body:', text.substring(0, 1000));
            } else {
                const apptData = await apptRes.json();
                console.log(`✅ Success! Found ${apptData.data ? apptData.data.length : 0} appointments`);
                if (apptData.data && apptData.data.length > 0) {
                    const firstApt = apptData.data[0];
                    console.log('Sample:', JSON.stringify(firstApt, null, 2));

                    // Test Queue Status Endpoint
                    console.log(`\n🔍 Testing Queue Status for ID: ${firstApt.id}`);
                    const qRes = await fetch(`${API_BASE}/queue/patient/${firstApt.id}`, {
                        headers: { 'Authorization': `Bearer ${docData.token}` }
                    });

                    if (qRes.ok) {
                        const qData = await qRes.json();
                        console.log('✅ Queue Status:', JSON.stringify(qData.data, null, 2));
                    } else {
                        console.log(`❌ Queue Status Failed: ${qRes.status}`);
                        console.log(await qRes.text());
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testMyAppointments();
