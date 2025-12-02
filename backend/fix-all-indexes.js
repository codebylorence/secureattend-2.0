import sequelize from "./config/database.js";

const fixTableIndexes = async (tableName) => {
  try {
    console.log(`\n🔧 Fixing ${tableName} table indexes...`);
    
    // Get all indexes
    const [indexes] = await sequelize.query(`SHOW INDEX FROM ${tableName};`);
    
    console.log(`Found ${indexes.length} indexes`);
    
    // Group by key_name
    const indexGroups = {};
    indexes.forEach(index => {
      if (!indexGroups[index.Key_name]) {
        indexGroups[index.Key_name] = [];
      }
      indexGroups[index.Key_name].push(index);
    });
    
    // Drop all non-PRIMARY indexes
    for (const keyName of Object.keys(indexGroups)) {
      if (keyName !== 'PRIMARY') {
        try {
          await sequelize.query(`DROP INDEX \`${keyName}\` ON ${tableName};`);
          console.log(`  ✅ Dropped: ${keyName}`);
        } catch (error) {
          console.log(`  ⚠️  ${keyName}: ${error.message}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${tableName}:`, error.message);
    return false;
  }
};

const recreateNecessaryIndexes = async () => {
  console.log("\n✨ Recreating necessary indexes...");
  
  const indexes = [
    { table: 'Employees', column: 'employee_id', name: 'employee_id_unique' },
    { table: 'Users', column: 'username', name: 'username_unique' }
  ];
  
  for (const idx of indexes) {
    try {
      await sequelize.query(`
        CREATE UNIQUE INDEX ${idx.name} ON ${idx.table}(${idx.column});
      `);
      console.log(`  ✅ Created ${idx.name} on ${idx.table}`);
    } catch (error) {
      console.log(`  ⚠️  ${idx.name}: ${error.message}`);
    }
  }
};

const fixAllIndexes = async () => {
  try {
    console.log("🔧 Fixing all table indexes...\n");
    
    const tables = ['Employees', 'Users', 'Attendances', 'Departments', 
                    'ScheduleTemplates', 'EmployeeSchedules', 'ScheduleDrafts',
                    'TemplateDrafts', 'Notifications'];
    
    for (const table of tables) {
      await fixTableIndexes(table);
    }
    
    await recreateNecessaryIndexes();
    
    console.log("\n✅ All table indexes fixed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

fixAllIndexes();
