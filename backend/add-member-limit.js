import sequelize from "./config/database.js";
import Schedule from "./models/schedule.js";

async function addMemberLimitColumn() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully.");

    console.log("Adding member_limit column to schedules table...");
    
    // Check if column exists first
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedules' AND column_name = 'member_limit';
    `);
    
    if (columns.length === 0) {
      // Add the column using raw SQL
      await sequelize.query(`
        ALTER TABLE schedules 
        ADD COLUMN member_limit INTEGER DEFAULT NULL;
      `);
      console.log("✓ member_limit column added successfully!");
    } else {
      console.log("✓ member_limit column already exists, skipping...");
    }

    console.log("✓ member_limit column added successfully!");
    
    // Verify the column was added
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'schedules' AND column_name = 'member_limit';
    `);
    
    if (results.length > 0) {
      console.log("✓ Verified: member_limit column exists");
      console.log("Column details:", results[0]);
    } else {
      console.log("⚠ Warning: Could not verify member_limit column");
    }

    console.log("\nMigration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

addMemberLimitColumn();
