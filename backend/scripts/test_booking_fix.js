
const API_BASE = 'http://localhost:5000/api';

async function testBookingFix() {
    console.log('🧪 Testing Booking Fix (Auto-Verify CONFIRMED status)\n');

    try {
        // 1. Login as Patient
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'leilani_farrell64@gmail.com', password: 'password123' })
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok) {
            console.error('❌ Login Failed:', loginData);
            return;
        }

        const token = loginData.token;
        console.log('✅ Logged in as:', loginData.user.name);

        // 2. Find a doctor slot (using a mock slot ID pattern logic or just picking a known one if hard for now)
        // Actually, let's just use the "Create Appointment" API which needs a doctorId and slotId.
        // We need a valid slotId. Since I don't want to query slots, I'll use the raw slot ID format [RuleID][Date][Time]
        // Let's guess a doctor ID = 2 (Dr. Sarah Khan usually). Rule ID 1.
        // Date: Tomorrow. Time: 1000.

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const slotId = `1${dateStr}1000`; // Rule 1, Tomorrow, 10:00 AM

        console.log('📅 Attempting to book with Slot ID:', slotId);

        const bookRes = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                doctorId: 2,
                slotId: slotId,
                symptoms: 'Test Confirmation Fix',
                appointmentType: 'physical'
            })
        });

        const bookData = await bookRes.json();

        if (bookRes.ok) {
            console.log('✅ Booking Response:', JSON.stringify(bookData, null, 2));
            if (bookData.appointment.status === 'CONFIRMED') {
                console.log('🎉 SUCCESS: Appointment is CONFIRMED instantly!');
                console.log('🔢 Queue Number:', bookData.appointment.queueNumber);
            } else {
                console.log('⚠️ FAILURE: Status is still', bookData.appointment.status);
            }
        } else {
            console.log('❌ Booking Failed:', bookData);
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

testBookingFix();
