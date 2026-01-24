const pool = require('../config/db');

/**
 * Check Queue Data - Verify queue entries for today
 */
async function checkQueueData() {
    console.log('🔍 Checking Queue Data for Today...\n');
    console.log('='.repeat(60));

    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Get total queue count for today
        const [queueCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM appointment_queue WHERE queue_date = ?',
            [today]
        );
        console.log(`📊 Total Queue Entries for Today (${today}): ${queueCount[0].count}\n`);

        // 2. Get queue status breakdown
        const [statusBreakdown] = await pool.execute(
            `SELECT status, COUNT(*) as count 
             FROM appointment_queue 
             WHERE queue_date = ? 
             GROUP BY status 
             ORDER BY FIELD(status, 'WAITING', 'IN_PROGRESS', 'COMPLETED')`,
            [today]
        );

        console.log('Queue Status Breakdown:');
        console.log('-'.repeat(60));
        statusBreakdown.forEach(row => {
            console.log(`   ${row.status.padEnd(20)} : ${row.count}`);
        });
        console.log('');

        // 3. Get doctors with active queues today
        const [doctorQueues] = await pool.execute(
            `SELECT 
                d.id,
                d.full_name as doctor_name,
                d.specialization,
                COUNT(q.id) as total_queue,
                SUM(CASE WHEN q.status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN q.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN q.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
             FROM doctors d
             LEFT JOIN appointment_queue q ON d.id = q.doctor_id AND q.queue_date = ?
             GROUP BY d.id, d.full_name, d.specialization
             HAVING total_queue > 0
             ORDER BY total_queue DESC
             LIMIT 10`,
            [today]
        );

        console.log('Top 10 Doctors with Active Queues Today:');
        console.log('-'.repeat(60));
        console.log('ID'.padEnd(8) + 'Doctor Name'.padEnd(25) + 'Total'.padEnd(8) + 'Waiting'.padEnd(10) + 'In Prog'.padEnd(10) + 'Done');
        console.log('-'.repeat(60));
        doctorQueues.forEach(row => {
            console.log(
                `${row.id}`.padEnd(8) +
                row.doctor_name.substring(0, 24).padEnd(25) +
                `${row.total_queue}`.padEnd(8) +
                `${row.waiting}`.padEnd(10) +
                `${row.in_progress}`.padEnd(10) +
                `${row.completed}`
            );
        });
        console.log('');

        // 4. Sample queue details for first doctor
        if (doctorQueues.length > 0) {
            const firstDoctorId = doctorQueues[0].id;
            const [queueDetails] = await pool.execute(
                `SELECT 
                    q.queue_number,
                    q.status,
                    p.full_name as patient_name,
                    a.appointment_time,
                    a.reason_for_visit
                 FROM appointment_queue q
                 JOIN patients p ON q.patient_id = p.id
                 JOIN appointments a ON q.appointment_id = a.id
                 WHERE q.doctor_id = ? AND q.queue_date = ?
                 ORDER BY q.queue_number ASC
                 LIMIT 10`,
                [firstDoctorId, today]
            );

            console.log(`Sample Queue Details for Doctor #${firstDoctorId} (${doctorQueues[0].doctor_name}):`);
            console.log('-'.repeat(60));
            console.log('#'.padEnd(5) + 'Status'.padEnd(15) + 'Patient'.padEnd(25) + 'Time');
            console.log('-'.repeat(60));
            queueDetails.forEach(row => {
                console.log(
                    `${row.queue_number}`.padEnd(5) +
                    row.status.padEnd(15) +
                    row.patient_name.substring(0, 24).padEnd(25) +
                    row.appointment_time
                );
            });
            console.log('');
        }

        // 5. Overall statistics
        const [overallStats] = await pool.execute(
            `SELECT 
                COUNT(DISTINCT doctor_id) as doctors_with_queues,
                COUNT(DISTINCT patient_id) as unique_patients,
                COUNT(*) as total_entries,
                AVG(queue_number) as avg_queue_num
             FROM appointment_queue
             WHERE queue_date = ?`,
            [today]
        );

        console.log('Overall Statistics:');
        console.log('-'.repeat(60));
        console.log(`   Doctors with Active Queues: ${overallStats[0].doctors_with_queues}`);
        console.log(`   Unique Patients in Queue: ${overallStats[0].unique_patients}`);
        console.log(`   Total Queue Entries: ${overallStats[0].total_entries}`);
        console.log(`   Average Queue Number: ${Math.round(overallStats[0].avg_queue_num)}`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ Queue Data Check Complete!\n');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking queue data:', error);
        await pool.end();
        process.exit(1);
    }
}

checkQueueData();
