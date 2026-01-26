/**
 * Migration Script: Backfill Missing Names in Profile Tables
 * 
 * This script updates the full_name field for users who don't have it set.
 * It extracts a name from the email address as a fallback.
 * 
 * Usage: node migrations/backfill_names.js
 */

const pool = require('../config/db');

const backfillNames = async () => {
    try {
        console.log('🔄 Starting name backfill process...\n');

        // Backfill doctors
        console.log('📋 Checking doctors table...');
        const [doctors] = await pool.execute(`
            SELECT d.id, d.user_id, u.email, d.full_name
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            WHERE d.full_name IS NULL OR d.full_name = ''
        `);

        if (doctors.length > 0) {
            console.log(`   Found ${doctors.length} doctors without names`);
            for (const doctor of doctors) {
                // Extract name from email (e.g., john.doe@example.com -> John Doe)
                const emailName = doctor.email.split('@')[0]
                    .replace(/[._-]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                await pool.execute(
                    'UPDATE doctors SET full_name = ? WHERE id = ?',
                    [emailName, doctor.id]
                );
                console.log(`   ✅ Updated doctor ${doctor.email} -> ${emailName}`);
            }
        } else {
            console.log('   ✅ All doctors have names');
        }

        // Backfill patients
        console.log('\n📋 Checking patients table...');
        const [patients] = await pool.execute(`
            SELECT p.id, p.user_id, u.email, p.full_name
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE p.full_name IS NULL OR p.full_name = ''
        `);

        if (patients.length > 0) {
            console.log(`   Found ${patients.length} patients without names`);
            for (const patient of patients) {
                const emailName = patient.email.split('@')[0]
                    .replace(/[._-]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                await pool.execute(
                    'UPDATE patients SET full_name = ? WHERE id = ?',
                    [emailName, patient.id]
                );
                console.log(`   ✅ Updated patient ${patient.email} -> ${emailName}`);
            }
        } else {
            console.log('   ✅ All patients have names');
        }

        // Backfill hospital admins
        console.log('\n📋 Checking hospital_admins table...');
        const [admins] = await pool.execute(`
            SELECT ha.id, ha.user_id, u.email, ha.full_name
            FROM hospital_admins ha
            JOIN users u ON ha.user_id = u.id
            WHERE ha.full_name IS NULL OR ha.full_name = ''
        `);

        if (admins.length > 0) {
            console.log(`   Found ${admins.length} hospital admins without names`);
            for (const admin of admins) {
                const emailName = admin.email.split('@')[0]
                    .replace(/[._-]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                await pool.execute(
                    'UPDATE hospital_admins SET full_name = ? WHERE id = ?',
                    [emailName, admin.id]
                );
                console.log(`   ✅ Updated admin ${admin.email} -> ${emailName}`);
            }
        } else {
            console.log('   ✅ All hospital admins have names');
        }

        // Backfill super admins
        console.log('\n📋 Checking super_admins table...');
        const [superAdmins] = await pool.execute(`
            SELECT sa.id, sa.user_id, u.email, sa.full_name
            FROM super_admins sa
            JOIN users u ON sa.user_id = u.id
            WHERE sa.full_name IS NULL OR sa.full_name = ''
        `);

        if (superAdmins.length > 0) {
            console.log(`   Found ${superAdmins.length} super admins without names`);
            for (const sa of superAdmins) {
                const emailName = sa.email.split('@')[0]
                    .replace(/[._-]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                await pool.execute(
                    'UPDATE super_admins SET full_name = ? WHERE id = ?',
                    [emailName, sa.id]
                );
                console.log(`   ✅ Updated super admin ${sa.email} -> ${emailName}`);
            }
        } else {
            console.log('   ✅ All super admins have names');
        }

        console.log('\n✅ Name backfill process completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during backfill:', error);
        process.exit(1);
    }
};

backfillNames();
