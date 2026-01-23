const pool = require('../config/db');

async function checkQueueTables() {
    console.log('🔍 Queue Tables Investigation\n');

    try {
        // 1. Check appointments table
        console.log('📋 APPOINTMENTS TABLE');
        console.log('-'.repeat(60));
        const [apptSchema] = await pool.query('DESCRIBE appointments');
        apptSchema.forEach(c => console.log(`  ${c.Field.padEnd(20)} ${c.Type.padEnd(15)} ${c.Key}`));

        const [apptCount] = await pool.query('SELECT COUNT(*) as cnt FROM appointments');
        console.log(`\nTotal appointments: ${apptCount[0].cnt}`);

        // 2. Check appointment_queue table
        console.log('\n📋 APPOINTMENT_QUEUE TABLE');
        console.log('-'.repeat(60));
        const [queueSchema] = await pool.query('DESCRIBE appointment_queue');
        queueSchema.forEach(c => console.log(`  ${c.Field.padEnd(20)} ${c.Type.padEnd(15)} ${c.Key}`));

        const [queueCount] = await pool.query('SELECT COUNT(*) as cnt FROM appointment_queue');
        console.log(`\nTotal queue records: ${queueCount[0].cnt}`);

        // 3. Check today's appointments
        const today = '2026-01-23';
        console.log(`\n📅 TODAY'S APPOINTMENTS (${today})`);
        console.log('-'.repeat(60));
        const [todayAppts] = await pool.query(
            `SELECT id, doctor_id, patient_id, queue_number, status 
             FROM appointments 
             WHERE appointment_date = ?
             ORDER BY queue_number`,
            [today]
        );
        console.log(`Found: ${todayAppts.length} appointments`);
        todayAppts.forEach(a => {
            console.log(`  ID:${a.id} Queue#${a.queue_number} Doctor:${a.doctor_id} Status:${a.status}`);
        });

        // 4. Check queue_number duplicates
        console.log('\n⚠️  DUPLICATE QUEUE NUMBERS CHECK');
        console.log('-'.repeat(60));
        const [dups] = await pool.query(
            `SELECT doctor_id, appointment_date, queue_number, COUNT(*) as cnt
             FROM appointments
             WHERE queue_number IS NOT NULL
             GROUP BY doctor_id, appointment_date, queue_number
             HAVING cnt > 1`
        );
        if (dups.length > 0) {
            console.log('❌ DUPLICATES FOUND:');
            dups.forEach(d => console.log(`  Doctor${d.doctor_id} ${d.appointment_date} Queue#${d.queue_number} = ${d.cnt} times`));
        } else {
            console.log('✅ No duplicates');
        }

        // 5. Sample queue_table data
        if (queueCount[0].cnt > 0) {
            console.log('\n📊 SAMPLE APPOINTMENT_QUEUE DATA');
            console.log('-'.repeat(60));
            const [qSample] = await pool.query('SELECT * FROM appointment_queue LIMIT 3');
            qSample.forEach(q => console.log(`  ${JSON.stringify(q)}`));
        } else {
            console.log('\n⚠️  APPOINTMENT_QUEUE TABLE IS EMPTY');
        }

        // 6. Test the actual queue query
        console.log('\n🔎 TESTING QUEUE CONTROLLER QUERY');
        console.log('-'.repeat(60));
        const [qTest] = await pool.query(
            `SELECT a.id, a.queue_number, a.status, p.full_name
             FROM appointments a
             LEFT JOIN patients p ON a.patient_id = p.id
             WHERE a.doctor_id = 4 AND a.appointment_date = ?
             AND a.status != 'CANCELLED'
             ORDER BY a.queue_number`,
            [today]
        );
        console.log(`Query result: ${qTest.length} appointments`);
        qTest.forEach(a => console.log(`  Queue#${a.queue_number}: ${a.full_name} [${a.status}]`));

        console.log('\n' + '='.repeat(60));
        console.log('CONCLUSION:');
        console.log(`- Appointments table: ${apptCount[0].cnt} records`);
        console.log(`- Appointment_queue table: ${queueCount[0].cnt} records`);
        console.log(`- Queue query works: ${qTest.length > 0 ? '✅ YES' : '❌ NO'}`);
        console.log(`- Duplicates: ${dups.length > 0 ? '❌ YES' : '✅ NO'}`);

        if (queueCount[0].cnt === 0) {
            console.log('\n💡 The appointment_queue table appears to be unused.');
            console.log('   The queue system reads from appointments table directly.');
        }

        await pool.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkQueueTables();
