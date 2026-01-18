/**
 * Comprehensive Slot Creation Test
 * Tests the entire flow from frontend to database
 */

const axios = require('axios');
const mysql = require('mysql2/promise');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
    console.log('🧪 SLOT CREATION COMPREHENSIVE TEST\n');
    console.log('=' .repeat(50));
    
    let connection;
    let token;
    let doctorId;
    
    try {
        // Step 1: Connect to database
        console.log('\n📊 Step 1: Connecting to database...');
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'mediconnect'
        });
        console.log('✅ Database connected');
        
        // Step 2: Check if doctor exists
        console.log('\n👨‍⚕️ Step 2: Checking for test doctor...');
        const [doctors] = await connection.execute(
            'SELECT id, email FROM doctors LIMIT 1'
        );
        
        if (doctors.length === 0) {
            console.log('❌ No doctors found in database');
            console.log('Please create a doctor account first');
            return;
        }
        
        doctorId = doctors[0].id;
        const doctorEmail = doctors[0].email;
        console.log(`✅ Found doctor: ID=${doctorId}, Email=${doctorEmail}`);
        
        // Step 3: Try to login
        console.log('\n🔐 Step 3: Attempting doctor login...');
        try {
            const loginResponse = await axios.post(`${API_BASE}/users/doctor/login`, {
                email: doctorEmail,
                password: 'test123' // Updated password
            });
            
            token = loginResponse.data.token;
            console.log('✅ Login successful');
            console.log('Token:', token.substring(0, 20) + '...');
        } catch (error) {
            console.log('⚠️ Login failed with saved password');
            console.log('Error:', error.response?.data?.message);
            console.log('\nℹ️ You need to use a valid doctor login credentials');
            console.log('Please update the password in this test or login manually');
            return;
        }
        
        // Step 4: Test backend availability
        console.log('\n🌐 Step 4: Testing backend availability...');
        try {
            const healthCheck = await axios.get(`${API_BASE}/users/health`);
            console.log('✅ Backend is running');
        } catch (error) {
            console.log('❌ Backend not responding');
            console.log('Make sure the backend server is running on port 5000');
            return;
        }
        
        // Step 5: Create test slot
        console.log('\n📅 Step 5: Creating test slot...');
        
        const slotData = {
            slotDate: '2026-02-25',
            slotStartTime: '10:00',  // Testing HH:mm format
            slotEndTime: '14:00',
            appointmentType: 'physical',
            maxAppointments: 12,
            recurring: false
        };
        
        console.log('Slot data:', JSON.stringify(slotData, null, 2));
        
        try {
            const slotResponse = await axios.post(
                `${API_BASE}/slots`,
                slotData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('✅ Slot created successfully!');
            console.log('Response:', JSON.stringify(slotResponse.data, null, 2));
            
            // Step 6: Verify in database
            console.log('\n✔️ Step 6: Verifying in database...');
            const [slots] = await connection.execute(
                'SELECT * FROM doctor_slots WHERE doctor_id = ? ORDER BY created_at DESC LIMIT 1',
                [doctorId]
            );
            
            if (slots.length > 0) {
                console.log('✅ Slot verified in database:');
                console.log(slots[0]);
            }
            
            console.log('\n' + '='.repeat(50));
            console.log('🎉 ALL TESTS PASSED!');
            console.log('='.repeat(50));
            
        } catch (error) {
            console.log('❌ Slot creation failed');
            console.log('Status:', error.response?.status);
            console.log('Error:', JSON.stringify(error.response?.data, null, 2));
            
            if (error.response?.status === 401) {
                console.log('\n⚠️ Authentication issue - Token may be invalid');
            }
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n📊 Database connection closed');
        }
    }
}

// Run tests
runTests();
