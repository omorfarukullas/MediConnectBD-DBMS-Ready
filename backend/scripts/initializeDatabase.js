const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    console.log('🔄 Initializing Database Schema...');

    try {
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon but ignore comments (simple approach) or execute as one block if client supports multiple statements
        // mysql2 supports multiple statements if configured, but let's split safely

        // Better approach for safe execution:
        // 1. Remove comments
        // 2. Split by semicolon
        // 3. Filter empty commands

        const connection = await pool.getConnection();

        // Enable multiple statements
        // NOTE: Standard pool might not allow multiple statements unless specified in config
        // So we will execute one by one

        // Remove comments
        const cleanSchema = schema
            .replace(/--.*$/gm, '') // Remove line comments
            .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

        const statements = cleanSchema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`📝 Found ${statements.length} SQL statements to execute.`);

        for (const sql of statements) {
            try {
                // Handle delimiter changes if any (not common in this schema, but good practice)
                await connection.query(sql);
            } catch (err) {
                console.error('❌ Failed to execute statement:', sql.substring(0, 50) + '...');
                console.error('Error:', err.message);
                throw err;
            }
        }

        connection.release();
        console.log('✅ Database schema initialized successfully.\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        process.exit(1);
    }
}

initializeDatabase();
