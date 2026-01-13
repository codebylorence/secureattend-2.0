import sequelize from "../config/database.js";

async function updateUserFields() {
  try {
    console.log("🔄 Updating User table fields...");
    
    // Add firstname and lastname columns
    try {
      await sequelize.getQueryInterface().addColumn('Users', 'firstname', {
        type: sequelize.Sequelize.STRING,
        allowNull: true,
        after: 'username'
      });
      console.log("✅ Added 'firstname' column");
    } catch (error) {
      if (error.message.includes("Duplicate column name")) {
        console.log("ℹ️ Column 'firstname' already exists");
      } else {
        throw error;
      }
    }

    try {
      await sequelize.getQueryInterface().addColumn('Users', 'lastname', {
        type: sequelize.Sequelize.STRING,
        allowNull: true,
        after: 'firstname'
      });
      console.log("✅ Added 'lastname' column");
    } catch (error) {
      if (error.message.includes("Duplicate column name")) {
        console.log("ℹ️ Column 'lastname' already exists");
      } else {
        throw error;
      }
    }

    // Migrate existing name data to firstname if name column exists
    try {
      const [results] = await sequelize.query("SHOW COLUMNS FROM Users LIKE 'name'");
      if (results.length > 0) {
        console.log("🔄 Migrating existing name data to firstname...");
        await sequelize.query(`
          UPDATE Users 
          SET firstname = name 
          WHERE name IS NOT NULL AND firstname IS NULL
        `);
        console.log("✅ Migrated name data to firstname");
        
        // Remove the name column
        await sequelize.getQueryInterface().removeColumn('Users', 'name');
        console.log("✅ Removed 'name' column");
      }
    } catch (error) {
      console.log("ℹ️ Name column doesn't exist or already migrated");
    }
    
    console.log("✅ User table update completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    await sequelize.close();
  }
}

updateUserFields();