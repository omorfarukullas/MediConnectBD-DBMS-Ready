// Quick test script to verify backend API is accessible
// Run this in browser console or as a standalone test

const testBackendConnection = async () => {
    const API_URL = 'http://localhost:5000/api';

    console.log('🧪 Testing backend connection...');
    console.log('📍 API URL:', API_URL);

    try {
        // Test 1: Health check endpoint
        console.log('\n1️⃣ Testing health endpoint...');
        const healthResponse = await fetch(`${API_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check passed:', healthData);

        // Test 2: Doctors endpoint (public)
        console.log('\n2️⃣ Testing doctors endpoint...');
        const doctorsResponse = await fetch(`${API_URL}/doctors`);
        const doctorsData = await doctorsResponse.json();
        console.log('✅ Doctors endpoint accessible:', doctorsData.length, 'doctors found');

        console.log('\n✅ All tests passed! Backend is accessible.');
        return true;
    } catch (error) {
        console.error('\n❌ Backend connection failed:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name
        });

        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Check if backend server is running: npm run dev (in backend folder)');
        console.log('2. Verify backend is on port 5000: netstat -ano | findstr :5000');
        console.log('3. Check for CORS errors in browser console');
        console.log('4. Ensure .env file has: VITE_API_URL=http://localhost:5000/api');
        console.log('5. Restart frontend dev server to reload .env variables');

        return false;
    }
};

// Run the test
testBackendConnection();
