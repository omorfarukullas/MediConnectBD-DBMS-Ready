const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'mediconnect',
            multipleStatements: true
        });

        console.log('✅ Connected to database');

        // Read migration file
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'migration_queue_simple.sql'), 'utf8');

        // Execute migration
        console.log('📝 Running migration...');
        await connection.query(migrationSQL);

        console.log('✅ Migration completed successfully!');
        
        await connection.end();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
