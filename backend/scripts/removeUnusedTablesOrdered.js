import sequelize from '../config/database.js';

async function removeUnusedTablesOrdered() {
  try {
    console.log('🗑️ Removing unused tables from database (ordered by dependencies)...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Disable foreign key checks temporarily
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔓 Disabled foreign key checks');
    
    // List of unused tables to remove (order doesn't matter now)
    const unusedTables = [
      'role_schedule_templates',      // Unused role-based scheduling table
      'zone_schedule_templates',      // Unused zone-based scheduling table
      'warehouse_roles',              // Unused warehouse table
      'warehouse_zones',              // Unused warehouse table
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
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔒 Re-enabled foreign key checks');
    
    console.log('✅ Successfully cleaned up unused tables');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

removeUnusedTablesOrdered();