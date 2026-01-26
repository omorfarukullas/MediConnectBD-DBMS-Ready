
const { getTodayQueue } = require('./controllers/queueController');
const pool = require('./config/db');

// Mock Express objects
const req = {
    params: { doctorId: '10014' },
    query: {},
    user: {
        id: 1113,
        profile_id: 10014,
        role: 'DOCTOR'
    }
};

const res = {
    status: function (code) {
        console.log('Response Status:', code);
        return this;
    },
    json: function (data) {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
        return this;
    }
};

async function test() {
    try {
        console.log('--- Testing getTodayQueue Controller ---');
        await getTodayQueue(req, res);
        process.exit(0);
    } catch (err) {
        console.error('Test Error:', err);
        process.exit(1);
    }
}

test();
