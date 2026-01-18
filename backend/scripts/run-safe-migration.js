const mysql = require('mysql2/promise');
const fs = require('fs');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'mediconnect',
        multipleStatements: true
    });

    try {
        const sql = fs.readFileSync('./migration_safe.sql', 'utf8');
        console.log('Running migration...');
        
        await connection.query(sql);
        
        console.log('✅ Migration completed successfully!');
        
        const [slots] = await connection.query('SELECT COUNT(*) as count FROM doctor_slots');
        console.log(`📊 Total slots: ${slots[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
