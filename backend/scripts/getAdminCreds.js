const pool = require('../config/db');

async function getAdminDetail() {
    const email = 'nicola_harvey41@hotmail.com';
    try {
        // Find the user and their specific hospital
        const [rows] = await pool.execute(`
            SELECT u.email, h.name as hospital_name, h.city, h.type
            FROM users u
            JOIN hospital_admins ha ON u.id = ha.user_id
            JOIN hospitals h ON ha.hospital_id = h.id
            WHERE u.email = ?
        `, [email]);

        console.log('------------------------------------------------');
        if (rows.length > 0) {
            const info = rows[0];
            console.log(`Email:    ${info.email}`);
            console.log(`Hospital: ${info.hospital_name}`);
            console.log(`City:     ${info.city}`);
            console.log(`Type:     ${info.type}`);
        } else {
            console.log(`No hospital found for user ${email}`);
        }
        console.log('------------------------------------------------');

        // Also list a few other admins for reference
        console.log('\nOther Hospital Admins:');
        const [others] = await pool.execute(`
            SELECT u.email, h.name as hospital_name
            FROM users u
            JOIN hospital_admins ha ON u.id = ha.user_id
            JOIN hospitals h ON ha.hospital_id = h.id
            WHERE u.email != ?
            LIMIT 5
        `, [email]);

        others.forEach(admin => {
            console.log(`${admin.email} -> ${admin.hospital_name}`);
        });

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

getAdminDetail();
