const API_BASE = 'http://localhost:5000/api';

async function testSlotManagement() {
    console.log('🧪 Testing Slot Management (Doctor Portal Logic)\n');

    try {
        // 1. Login as Doctor
        console.log('1️⃣ LOGIN AS DOCTOR');
        // We need a known doctor credential. From masterSeed, we know password is 'password123'.
        // We can fetch a random doctor from the API to get their email if we don't know it.
        // But better to use a seeded one. masterSeed doesn't print all emails. 
        // Let's assume we can find one via DB query or just use the first one from /doctors public endpoint (some might have real emails)
        // Or better, let's pick a known one or query the DB for a valid doctor email.

        // For this script, we'll try to find a doctor email first via public API? No, public API might not show email.
        // Let's use a hardcoded one if possible or just try to login with 'bria51@hotmail.com' (Patient) to check fail? No.
        // Let's grab a doctor email from the DB first using a direct query helper if we ran this in node context with db access.
        // Since I'm running as a standalone script via node, i can use the db config if I require it.
        // But to keep it as an external API test, I'll rely on a known seed or fetch.

        // Let's use the 'check_doctor_user.js' approach or just use the DB directly here since I can.

        const pool = require('../config/db');
        const [docs] = await pool.execute(
            `SELECT u.email FROM users u JOIN doctors d ON d.user_id = u.id LIMIT 1`
        );

        if (docs.length === 0) {
            console.log('❌ No doctors found in DB');
            return;
        }

        const docEmail = docs[0].email;
        console.log(`   Found Doctor Email: ${docEmail}`);

        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: docEmail, password: 'password123' })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.log('❌ Login failed:', loginData);
            return;
        }
        console.log(`   ✅ Login success as ${loginData.name} (Profile ID: ${loginData.profileId})`);
        const token = loginData.token;

        // 2. Create Slot
        console.log('\n2️⃣ TEST: CREATE SLOT');
        const newSlot = {
            dayOfWeek: 'FRIDAY', // Use a day likely to be empty or just specific
            startTime: '08:00',
            endTime: '12:00',
            consultationType: 'PHYSICAL',
            maxPatients: 10,
            slotDuration: 15
        };

        const createRes = await fetch(`${API_BASE}/slots`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newSlot)
        });

        const createData = await createRes.json();

        let slotId;
        if (createRes.ok) {
            console.log('   ✅ Slot Created Successfully:', createData);
            slotId = createData.slotId;
        } else {
            console.log('   ❌ Create Slot Failed:', createData);
        }

        if (slotId) {
            // 3. Update Slot
            console.log('\n3️⃣ TEST: UPDATE SLOT');
            const updateLoad = {
                maxPatients: 15,
                consultationType: 'BOTH'
            };

            const updateRes = await fetch(`${API_BASE}/slots/${slotId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateLoad)
            });
            const updateData = await updateRes.json();

            if (updateRes.ok) {
                console.log('   ✅ Slot Updated Successfully:', updateData);
            } else {
                console.log('   ❌ Update Slot Failed:', updateData);
            }

            // 4. Delete Slot
            console.log('\n4️⃣ TEST: DELETE SLOT');
            const deleteRes = await fetch(`${API_BASE}/slots/${slotId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const deleteData = await deleteRes.json();

            if (deleteRes.ok) {
                console.log('   ✅ Slot Deleted Successfully:', deleteData);
            } else {
                console.log('   ❌ Delete Slot Failed:', deleteData); // Expecting this to fail based on code review
            }
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testSlotManagement();
