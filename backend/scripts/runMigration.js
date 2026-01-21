import sequelize from '../config/database.js';
import { up } from '../migrations/20250121_update_department_nullable.js';

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Run the migration
    await up(sequelize.getQueryInterface(), sequelize);
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();