const API_BASE = 'http://localhost:5000/api';

async function testReviewFlow() {
    console.log('🧪 Testing Review Submission Flow\n');

    try {
        // 1. Login as Patient
        console.log('1️⃣ LOGIN AS PATIENT (bria51@hotmail.com)');
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'bria51@hotmail.com', password: 'password123' })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.log('❌ Login failed:', loginData);
            return;
        }
        console.log('✅ Login success');
        const token = loginData.token;
        const patientId = loginData.profileId;

        // 2. Get a Doctor to review
        console.log('\n2️⃣ GET DOCTOR');
        const docsRes = await fetch(`${API_BASE}/doctors`);
        const docsData = await docsRes.json();
        if (docsData.length === 0) {
            console.log('❌ No doctors found');
            return;
        }
        const doctorId = docsData[0].id;
        console.log(`Initial Rating: ${docsData[0].rating} (${docsData[0].reviewCount} reviews)`);

        // 3. Submit Review
        console.log(`\n3️⃣ SUBMITTING REVIEW for Doctor ${doctorId}`);
        const reviewLoad = {
            doctorId: doctorId,
            rating: 5,
            comment: "Excellent service, very professional!"
        };

        const reviewRes = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reviewLoad)
        });

        const reviewData = await reviewRes.json();

        if (reviewRes.status === 400 && reviewData.message.includes('already reviewed')) {
            console.log('⚠️ Already reviewed this doctor coverage (Expected if re-running test)');
        } else if (!reviewRes.ok) {
            console.log('❌ Review failed:', reviewData);
            return;
        } else {
            console.log('✅ Review created:', reviewData.review.id);
            console.log('   Patient ID in Review:', reviewData.review.patientId);

            if (reviewData.review.patientId !== patientId) {
                console.log('❌ Patient ID Mismatch! Controller used User ID?');
            } else {
                console.log('✅ Patient ID Match!');
            }
        }

        // 4. Verify Doctor Rating Updated
        console.log('\n4️⃣ VERIFYING DOCTOR RATING');
        const updatedDocsRes = await fetch(`${API_BASE}/doctors`);
        const updatedDocsData = await updatedDocsRes.json();
        const updatedDoc = updatedDocsData.find(d => d.id === doctorId);

        console.log(`Updated Rating: ${updatedDoc.rating} (${updatedDoc.reviewCount} reviews)`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testReviewFlow();
