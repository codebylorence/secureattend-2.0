import sequelize from '../config/database.js';
import '../models/scheduleTemplate.js'; // Import the updated model

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');
    
    // Sync the database with alter: true to add new columns
    await sequelize.sync({ alter: true });
    
    console.log('✅ Migration completed successfully!');
    console.log('New fields added to schedule_templates:');
    console.log('  - is_edited (BOOLEAN)');
    console.log('  - original_template_id (INTEGER)');
    console.log('  - edited_at (DATE)');
    console.log('  - edited_by (STRING)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();