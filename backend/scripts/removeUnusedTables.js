import sequelize from '../config/database.js';

async function removeUnusedTables() {
  try {
    console.log('🗑️ Removing unused tables from database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // List of unused tables to remove
    const unusedTables = [
      'employee_schedules',           // Replaced by template.assigned_employees
      'role_schedule_templates',      // Unused role-based scheduling table
      'zone_schedule_templates',      // Unused zone-based scheduling table
      'warehouse_roles',              // Unused warehouse table
      'warehouse_schedule_assignments', // Unused warehouse table
      'warehouse_zones',              // Unused warehouse table
      'schedulenotifications'         // Unused notifications table
    ];
    
    for (const tableName of unusedTables) {
      try {
        // Check if table exists first
        const tableExists = await queryInterface.showAllTables();
        const tableExistsInDb = tableExists.some(table => 
          table.toLowerCase() === tableName.toLowerCase()
        );
        
        if (tableExistsInDb) {
          await queryInterface.dropTable(tableName);
          console.log(`✅ Dropped table: ${tableName}`);
        } else {
          console.log(`⚠️ Table ${tableName} does not exist, skipping`);
        }
      } catch (error) {
        console.log(`⚠️ Could not drop table ${tableName}:`, error.message);
      }
    }
    
    console.log('✅ Successfully cleaned up unused tables');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

removeUnusedTables();