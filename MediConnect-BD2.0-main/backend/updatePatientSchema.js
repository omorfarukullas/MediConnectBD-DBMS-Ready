const sequelize = require('./config/db');

async function addMissingColumns() {
    try {
        console.log('\n🔧 Adding missing columns to patients table...\n');
        
        // Check and add blood_group column
        try {
            await sequelize.query(`
                ALTER TABLE patients 
                ADD COLUMN blood_group VARCHAR(5) NULL AFTER address
            `);
            console.log('✅ Added blood_group column');
        } catch (err) {
            if (err.message.includes('Duplicate column')) {
                console.log('ℹ️  blood_group column already exists');
            } else {
                throw err;
            }
        }
        
        // Check and add profile_image column
        try {
            await sequelize.query(`
                ALTER TABLE patients 
                ADD COLUMN profile_image VARCHAR(500) NULL AFTER blood_group
            `);
            console.log('✅ Added profile_image column');
        } catch (err) {
            if (err.message.includes('Duplicate column')) {
                console.log('ℹ️  profile_image column already exists');
            } else {
                throw err;
            }
        }
        
        console.log('\n✅ Database schema updated successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

addMissingColumns();
