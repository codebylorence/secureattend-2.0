import sequelize from "./config/database.js";

const fixEmployeeIndexes = async () => {
  try {
    console.log("🔧 Fixing Employee table indexes...");
    
    // Get all indexes on the Employees table
    const [indexes] = await sequelize.query(`
      SHOW INDEX FROM Employees;
    `);
    
    console.log(`Found ${indexes.length} indexes on Employees table`);
    
    // Group indexes by key_name
    const indexGroups = {};
    indexes.forEach(index => {
      if (!indexGroups[index.Key_name]) {
        indexGroups[index.Key_name] = [];
      }
      indexGroups[index.Key_name].push(index);
    });
    
    console.log("\nCurrent indexes:");
    Object.keys(indexGroups).forEach(keyName => {
      console.log(`  - ${keyName} (${indexGroups[keyName].length} columns)`);
    });
    
    // Drop all indexes except PRIMARY
    console.log("\n🗑️  Dropping duplicate indexes...");
    for (const keyName of Object.keys(indexGroups)) {
      if (keyName !== 'PRIMARY') {
        try {
          await sequelize.query(`DROP INDEX \`${keyName}\` ON Employees;`);
          console.log(`  ✅ Dropped index: ${keyName}`);
        } catch (error) {
          console.log(`  ⚠️  Could not drop ${keyName}: ${error.message}`);
        }
      }
    }
    
    // Recreate only the necessary unique index on employee_id
    console.log("\n✨ Creating necessary indexes...");
    try {
      await sequelize.query(`
        CREATE UNIQUE INDEX employee_id_unique ON Employees(employee_id);
      `);
      console.log("  ✅ Created unique index on employee_id");
    } catch (error) {
      console.log(`  ⚠️  Index might already exist: ${error.message}`);
    }
    
    console.log("\n✅ Employee table indexes fixed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing indexes:", error);
    process.exit(1);
  }
};

fixEmployeeIndexes();
