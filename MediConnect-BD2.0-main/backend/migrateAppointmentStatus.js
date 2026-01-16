const sequelize = require('./config/db');

async function migrateAppointmentStatus() {
    try {
        console.log('\n🔧 Migrating appointment status values...\n');
        
        // First, modify the ENUM to add new values
        await sequelize.query(`
            ALTER TABLE appointments 
            MODIFY COLUMN status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'ACCEPTED', 'REJECTED')
        `);
        console.log('✅ Added new status values to ENUM');
        
        // Update old values to new values
        await sequelize.query(`
            UPDATE appointments 
            SET status = 'CONFIRMED' 
            WHERE status = 'ACCEPTED'
        `);
        console.log('✅ Migrated ACCEPTED → CONFIRMED');
        
        await sequelize.query(`
            UPDATE appointments 
            SET status = 'CANCELLED' 
            WHERE status = 'REJECTED'
        `);
        console.log('✅ Migrated REJECTED → CANCELLED');
        
        // Remove old values from ENUM
        await sequelize.query(`
            ALTER TABLE appointments 
            MODIFY COLUMN status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')
        `);
        console.log('✅ Removed old status values from ENUM');
        
        console.log('\n✅ Migration completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

migrateAppointmentStatus();
