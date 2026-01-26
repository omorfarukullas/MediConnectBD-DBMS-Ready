const pool = require('../../config/db');

async function runMigration() {
    try {
        console.log('📊 Creating audit_logs table...');

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                action_type ENUM('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'PERMISSION_CHANGE', 'VIEW') NOT NULL,
                entity_type VARCHAR(50),
                entity_id INT,
                description TEXT,
                old_value TEXT,
                new_value TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_action_type (action_type),
                INDEX idx_created_at (created_at),
                INDEX idx_user_id (user_id),
                INDEX idx_entity_type (entity_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ audit_logs table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
