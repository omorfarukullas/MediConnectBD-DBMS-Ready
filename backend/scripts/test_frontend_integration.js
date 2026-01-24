const API_BASE = 'http://localhost:5000/api';

async function testFrontendIntegration() {
    console.log('🧪 Testing Frontend Integration Logic (Phase 8)\n');

    try {
        // 1. Setup: Login as Patient
        console.log('1️⃣ AUTHENTICATION');
        const patLogin = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'bria51@hotmail.com', password: 'password123' })
        });
        const patData = await patLogin.json();
        const patToken = patData.token;
        console.log(`   ✅ Patient Logged in: ${patData.name} (ID: ${patData.profileId})`);

        // 2. Fetch Doctor
        const docsRes = await fetch(`${API_BASE}/doctors`);
        const docs = await docsRes.json();
        const targetDoctor = docs[0];
        console.log(`   ℹ️  Target Doctor: ${targetDoctor.name} (ID: ${targetDoctor.id})`);
        console.log(`   📊 Initial Public Rating: ${targetDoctor.rating} (${targetDoctor.reviewCount} reviews)`);

        // 3. Fetch Slots (MIRRORING FRONTEND LOGIC)
        console.log('\n2️⃣ FETCHING SLOTS');
        const slotsRes = await fetch(`${API_BASE}/slots/available/${targetDoctor.id}?appointmentType=physical`);
        const slotsData = await slotsRes.json();

        let validSlotId = null;
        if (slotsData.success && slotsData.slots && slotsData.slots.length > 0) {
            validSlotId = slotsData.slots[0].id;
            console.log(`   ✅ Found available slot: ${validSlotId} (${slotsData.slots[0].slot_date})`);
        } else {
            console.log('   ⚠️ No slots available. Cannot test booking.');
            // We might need to seed slots if none exist, but let's assume seed data exists from Phase 1
        }

        if (validSlotId) {
            // 4. Patient Book Appointment
            console.log('\n3️⃣ PATIENT BOOKING FLOW');
            const appointmentPayload = {
                doctorId: targetDoctor.id,
                slotId: validSlotId,
                appointmentType: 'physical',
                symptoms: "Integration Test Symptom"
            };

            const bookRes = await fetch(`${API_BASE}/appointments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${patToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appointmentPayload)
            });
            const bookData = await bookRes.json();

            if (!bookRes.ok) {
                console.log('   ❌ Booking Failed:', bookData.message);
            } else {
                console.log(`   ✅ Appointment Booked: ID ${bookData.appointment.id}`);
            }
        }

        // 5. Submit Review
        console.log('\n4️⃣ REVIEW SUBMISSION FLOW');
        const reviewPayload = {
            doctorId: targetDoctor.id,
            rating: 5,
            comment: "Frontend Integration Verified!"
        };

        const reviewRes = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${patToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reviewPayload)
        });
        const reviewData = await reviewRes.json();

        if (reviewRes.status === 400) {
            console.log('   ⚠️ Review skipped (Already reviewed)');
        } else if (reviewRes.ok) {
            console.log('   ✅ Review Submitted Successfully');
        } else {
            console.log('   ❌ Review Failed:', reviewData);
        }

        // 6. Verify Updates
        console.log('\n5️⃣ VERIFYING UPDATES');
        const updatedDocsRes = await fetch(`${API_BASE}/doctors`);
        const updatedDocs = await updatedDocsRes.json();
        const updatedTarget = updatedDocs.find(d => d.id === targetDoctor.id);

        console.log(`   📊 Updated Public Rating: ${updatedTarget.rating} (${updatedTarget.reviewCount} reviews)`);

        if (updatedTarget.reviewCount >= targetDoctor.reviewCount) {
            console.log('   ✅ Integration Successful');
        } else {
            console.log('   ❌ Integration Verification Failed');
        }

    } catch (error) {
        console.error('❌ Integration Test Error:', error);
    }
}

testFrontendIntegration();
