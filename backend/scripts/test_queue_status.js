
const API_BASE = 'http://localhost:5000/api';

async function testQueueStatus() {
    console.log('🧪 Testing Queue Status Endpoint for Confirmed Appointment\n');

    try {
        // 1. Login
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'leilani_farrell64@gmail.com', password: 'password123' })
        });
        const loginData = await loginRes.json();

        if (!loginData.token) {
            console.error('❌ Login Failed');
            return;
        }

        const token = loginData.token;
        const appointmentId = 163; // The one we just booked

        // 2. Fetch Queue Status
        const url = `${API_BASE}/queue/patient/${appointmentId}`;
        console.log(`🔍 Fetching: ${url}`);

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok) {
            console.log('✅ Queue Status Response:', JSON.stringify(data.data, null, 2));
            if (data.data.queue_status === 'waiting') {
                console.log('🎉 SUCCESS: Status is correctly mapped to "waiting"');
            } else {
                console.log(`⚠️ FAILURE: Status is "${data.data.queue_status}" (Expected "waiting")`);
            }
        } else {
            console.error('❌ Failed:', JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

testQueueStatus();
