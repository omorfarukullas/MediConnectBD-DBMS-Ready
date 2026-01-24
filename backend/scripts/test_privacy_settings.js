const API_BASE = 'http://localhost:5000/api';

async function testPrivacy() {
    console.log('🧪 Testing Privacy Settings API\n');

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

        // 2. Get Current Settings
        console.log('\n2️⃣ GET CURRENT SETTINGS');
        const getRes = await fetch(`${API_BASE}/auth/privacy`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getData = await getRes.json();
        console.log('Current:', getData);

        // 3. Update Settings (Toggle)
        const newShare = !getData.shareHistory;
        const newSearch = !getData.visibleToSearch;

        console.log(`\n3️⃣ UPDATING TO: Share=${newShare}, Search=${newSearch}`);
        const updateRes = await fetch(`${API_BASE}/auth/privacy`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                shareHistory: newShare,
                visibleToSearch: newSearch
            })
        });

        const updateData = await updateRes.json();
        console.log('Update Response:', updateData);

        // 4. Verify Persistence
        console.log('\n4️⃣ VERIFYING PERSISTENCE');
        const verifyRes = await fetch(`${API_BASE}/auth/privacy`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const verifyData = await verifyRes.json();
        console.log('Verified:', verifyData);

        if (verifyData.shareHistory === newShare && verifyData.visibleToSearch === newSearch) {
            console.log('\n✅ TEST PASSED: Settings updated and persisted!');
        } else {
            console.log('\n❌ TEST FAILED: Settings do not match update!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testPrivacy();
