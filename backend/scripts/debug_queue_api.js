const pool = require('../config/db');

async function debugQueue(appointment_id) {
    console.log(`🔍 Debugging Queue for Appointment ID: ${appointment_id}`);

    try {
        const [rows] = await pool.execute(
            `SELECT 
                a.*,
                d.full_name as doctor_name,
                d.specialization,
                aq.queue_number
            FROM appointments a
            LEFT JOIN doctors d ON a.doctor_id = d.id
            LEFT JOIN appointment_queue aq ON a.id = aq.appointment_id
            WHERE a.id = ?`,
            [appointment_id]
        );

        console.log('📦 SQL Raw Result:');
        if (rows.length > 0) {
            console.log(JSON.stringify(rows[0], null, 2));

            // Simulate Controller Logic
            const appointment = rows[0];
            const responseData = {
                id: appointment.id,
                date: appointment.appointment_date,
                time: appointment.appointment_time,
                queue_number: appointment.queue_number || 0,
                queue_status: (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') ? 'waiting' : appointment.status.toLowerCase(),
                doctor_name: appointment.doctor_name,
                specialization: appointment.specialization,
                room_number: '101'
            };
            console.log('\n🛠️ Controller Transformed Data:');
            console.log(JSON.stringify(responseData, null, 2));
        } else {
            console.log('❌ No appointment found with this ID');
        }

    } catch (error) {
        console.error('❌ SQL Error:', error);
    } finally {
        pool.end();
    }
}

// Get ID from args or default to latest
async function run() {
    const args = process.argv.slice(2);
    let id = args[0];

    if (!id) {
        const [latest] = await pool.execute('SELECT id FROM appointments ORDER BY id DESC LIMIT 1');
        if (latest.length > 0) id = latest[0].id;
    }

    if (id) {
        await debugQueue(id);
    } else {
        console.log('No appointments available to test');
        pool.end();
    }
}

run();
