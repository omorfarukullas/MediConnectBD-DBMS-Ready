
const API_BASE = 'http://localhost:5000/api';

async function testRealSlotBooking() {
    console.log('🧪 Testing Real Slot Availability & Booking\n');

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

        if (!loginData.name) {
            console.error('❌ Login succeeded but no name returned:', loginData);
            return;
        }

        const token = loginData.token;
        console.log('✅ Logged in as:', loginData.name);

        // 2. Fetch Doctors to find a valid ID
        const docRes = await fetch(`${API_BASE}/doctors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const doctors = await docRes.json();

        if (!docRes.ok || doctors.length === 0) {
            console.error('❌ No doctors found or API failed');
            return;
        }

        const validDoctor = doctors[0]; // Pick first doctor
        console.log(`👨‍⚕️ Selected Doctor: ${validDoctor.name} (ID: ${validDoctor.id})`);

        // 3. Fetch Available Slots for this Doctor
        const slotsUrl = `${API_BASE}/slots/available/${validDoctor.id}?appointmentType=physical`;
        console.log(`🔍 Fetching slots from: ${slotsUrl}`);

        const slotsRes = await fetch(slotsUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const slotsData = await slotsRes.json();

        if (!slotsRes.ok) {
            console.error('❌ Failed to fetch slots:', slotsData);
            return;
        }

        console.log(`✅ Found ${slotsData.count} available slots.`);

        if (slotsData.count === 0) {
            console.warn('⚠️ No slots available for this doctor. Cannot test booking.');
            return;
        }

        // 4. Try booking slots until one succeeds
        for (const slot of slotsData.slots) {
            console.log(`\n📅 Attempting to book Slot ID: ${slot.id} (${slot.slot_start_time})`);

            const bookRes = await fetch(`${API_BASE}/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctorId: validDoctor.id,
                    slotId: slot.id,
                    symptoms: 'Debug Booking Loop ' + Date.now(),
                    appointmentType: 'physical'
                })
            });

            const bookData = await bookRes.json();

            if (bookRes.ok) {
                console.log('✅ Booking Response:', JSON.stringify(bookData, null, 2));
                if (bookData.appointment.status === 'CONFIRMED') {
                    console.log('🎉 SUCCESS: Appointment CONFIRMED!');
                    console.log('🔢 Queue Number:', bookData.appointment.queueNumber);
                    break; // Stop after first success
                } else {
                    console.log('⚠️ FAILURE: Status is', bookData.appointment.status);
                }
            } else {
                console.log(`❌ Booking Failed for ${slot.slot_start_time}:`, bookData.message || bookData);
                // Continue to next slot
            }
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

testRealSlotBooking();
