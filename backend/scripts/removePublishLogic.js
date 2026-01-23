import sequelize from '../config/database.js';

async function removePublishLogic() {
  try {
    console.log('🗑️ Removing publish logic fields from schedule_templates...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Remove publish-related columns
    const columnsToRemove = [
      'publish_status',
      'published_at', 
      'published_by',
      'pending_deletion',
      'is_edited',
      'original_template_id',
      'edited_at',
      'edited_by'
    ];
    
    for (const column of columnsToRemove) {
      try {
        await queryInterface.removeColumn('schedule_templates', column);
        console.log(`✅ Removed column: ${column}`);
      } catch (error) {
        console.log(`⚠️ Column ${column} might not exist or already removed:`, error.message);
      }
    }
    
    console.log('✅ Successfully removed publish logic fields');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

removePublishLogic();