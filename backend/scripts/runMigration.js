import sequelize from "../config/database.js";

async function runMigration() {
  try {
    console.log("🔄 Running migration: Add name field to Users table...");
    
    // Add the name column to Users table
    await sequelize.getQueryInterface().addColumn('Users', 'name', {
      type: sequelize.Sequelize.STRING,
      allowNull: true,
      after: 'username'
    });
    
    console.log("✅ Migration completed successfully!");
    console.log("📝 Added 'name' column to Users table");
    
  } catch (error) {
    if (error.message.includes("Duplicate column name")) {
      console.log("ℹ️ Column 'name' already exists in Users table");
    } else {
      console.error("❌ Migration failed:", error.message);
    }
  } finally {
    await sequelize.close();
  }
}

runMigration();