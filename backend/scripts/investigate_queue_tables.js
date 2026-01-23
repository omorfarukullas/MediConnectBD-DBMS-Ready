const pool = require('../config/db');

async function investigateQueueTables() {
    console.log('🔍 Investigating Appointments and Queue Tables\n');
    console.log('='.repeat(70) + '\n');

    try {
        const connection = await pool.getConnection();

        // 1. Check table schemas
        console.log('📋 TABLE SCHEMAS');
        console.log('-'.repeat(70));

        const [appointmentsSchema] = await connection.query('DESCRIBE appointments');
        console.log('\n1. APPOINTMENTS TABLE:');
        appointmentsSchema.forEach(col => {
            console.log(`   ${col.Field.padEnd(25)} ${col.Type.padEnd(20)} ${col.Key} ${col.Extra}`);
        });

        const [queueSchema] = await connection.query('DESCRIBE appointment_queue');
        console.log('\n2. APPOINTMENT_QUEUE TABLE:');
        queueSchema.forEach(col => {
            console.log(`   ${col.Field.padEnd(25)} ${col.Type.padEnd(20)} ${col.Key} ${col.Extra}`);
        });

        // 2. Check data in both tables
        console.log('\n\n📊 DATA ANALYSIS');
        console.log('-'.repeat(70));

        const [apptCount] = await connection.query('SELECT COUNT(*) as count FROM appointments');
        const [queueCount] = await connection.query('SELECT COUNT(*) as count FROM appointment_queue');

        console.log(`\nAppointments table: ${apptCount[0].count} rows`);
        console.log(`Appointment_queue table: ${queueCount[0].count} rows`);

        // 3. Check ID ranges and potential conflicts
        console.log('\n\n🔢 ID ANALYSIS');
        console.log('-'.repeat(70));

        const [apptIdRange] = await connection.query(
            'SELECT MIN(id) as min_id, MAX(id) as max_id FROM appointments'
        );
        const [queueIdRange] = await connection.query(
            'SELECT MIN(id) as min_id, MAX(id) as max_id FROM appointment_queue'
        );

        console.log(`\nAppointments IDs: ${apptIdRange[0].min_id} to ${apptIdRange[0].max_id}`);
        console.log(`Appointment_queue IDs: ${queueIdRange[0].min_id} to ${queueIdRange[0].max_id}`);

        // 4. Check if there's an appointment_id column in appointment_queue
        const hasAppointmentId = queueSchema.some(col => col.Field === 'appointment_id');
        console.log(`\nAppointment_queue has 'appointment_id' column: ${hasAppointmentId}`);

        if (hasAppointmentId) {
            // Check relationship
            const [orphaned] = await connection.query(
                `SELECT COUNT(*) as count 
                 FROM appointment_queue aq
                 LEFT JOIN appointments a ON aq.appointment_id = a.id
                 WHERE a.id IS NULL`
            );
            console.log(`Orphaned queue records (no matching appointment): ${orphaned[0].count}`);
        }

        // 5. Sample data from both tables
        console.log('\n\n📝 SAMPLE DATA');
        console.log('-'.repeat(70));

        const today = new Date().toISOString().split('T')[0];

        console.log('\nAPPOINTMENTS (today):');
        const [todayAppts] = await connection.query(
            `SELECT id, doctor_id, patient_id, appointment_date, queue_number, status
             FROM appointments
             WHERE appointment_date = ?
             ORDER BY queue_number
             LIMIT 5`,
            [today]
        );
        todayAppts.forEach(a => {
            console.log(`   ID: ${a.id}, Queue#: ${a.queue_number}, Doctor: ${a.doctor_id}, Patient: ${a.patient_id}, Status: ${a.status}`);
        });

        console.log('\nAPPOINTMENT_QUEUE (all):');
        const [queueData] = await connection.query(
            'SELECT * FROM appointment_queue ORDER BY id LIMIT 5'
        );
        if (queueData.length > 0) {
            console.log('   Columns:', Object.keys(queueData[0]).join(', '));
            queueData.forEach(q => {
                console.log(`   ${JSON.stringify(q)}`);
            });
        } else {
            console.log('   (empty table)');
        }

        // 6. Check what the queue controller is querying
        console.log('\n\n🔎 QUEUE CONTROLLER QUERY TEST');
        console.log('-'.repeat(70));

        const testDoctorId = 4; // Dr Test
        const [queueResult] = await connection.query(
            `SELECT 
                a.id,
                a.patient_id,
                a.appointment_date,
                a.appointment_time,
                a.queue_number,
                a.consultation_type,
                a.status,
                a.reason_for_visit,
                a.started_at,
                a.completed_at,
                p.full_name as patient_name,
                p.age,
                p.gender,
                p.phone
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            WHERE a.doctor_id = ? 
            AND a.appointment_date = ?
            AND a.status != 'CANCELLED'
            ORDER BY a.queue_number ASC`,
            [testDoctorId, today]
        );

        console.log(`\nQuery for Doctor ${testDoctorId} on ${today}:`);
        console.log(`Found ${queueResult.length} appointments`);
        queueResult.forEach(a => {
            console.log(`   Queue #${a.queue_number}: ${a.patient_name} @ ${a.appointment_time} [${a.status}]`);
        });

        // 7. Check for duplicate queue numbers
        console.log('\n\n⚠️  DUPLICATE CHECK');
        console.log('-'.repeat(70));

        const [duplicates] = await connection.query(
            `SELECT doctor_id, appointment_date, queue_number, COUNT(*) as count
             FROM appointments
             WHERE queue_number IS NOT NULL
             GROUP BY doctor_id, appointment_date, queue_number
             HAVING count > 1`
        );

        if (duplicates.length > 0) {
            console.log('\n❌ Found duplicate queue numbers:');
            duplicates.forEach(d => {
                console.log(`   Doctor ${d.doctor_id}, Date ${d.appointment_date}, Queue #${d.queue_number}: ${d.count} appointments`);
            });
        } else {
            console.log('\n✅ No duplicate queue numbers found');
        }

        // 8. CONCLUSION
        console.log('\n\n' + '='.repeat(70));
        console.log('📊 ANALYSIS RESULTS');
        console.log('='.repeat(70));

        console.log(`\n1. Appointments table has ${apptCount[0].count} records`);
        console.log(`2. Appointment_queue table has ${queueCount[0].count} records`);
        console.log(`3. Queue controller query returns ${queueResult.length} results`);
        console.log(`4. Duplicate queue numbers: ${duplicates.length > 0 ? 'YES ⚠️' : 'NO ✅'}`);

        if (queueCount[0].count === 0) {
            console.log('\n⚠️  ISSUE FOUND: appointment_queue table is EMPTY!');
            console.log('   The queue system uses the APPOINTMENTS table, not appointment_queue');
            console.log('   The appointment_queue table may be legacy/unused');
        }

        if (queueResult.length > 0 && todayAppts.length > 0) {
            console.log('\n✅ Appointments exist and query works correctly');
            console.log('   If frontend still fails, the issue is likely:');
            console.log('   1. Authentication (no token)');
            console.log('   2. Wrong doctor ID being passed');
            console.log('   3. API endpoint not receiving the request');
        }

        connection.release();
        await pool.end();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
        await pool.end();
        process.exit(1);
    }
}

investigateQueueTables();
