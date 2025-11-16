import sequelize from "./config/database.js";
import Schedule from "./models/schedule.js";

async function addDayLimitsColumn() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connected successfully.");

    console.log("Adding day_limits column to schedules table...");
    
    // Check if column exists first
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedules' AND column_name = 'day_limits';
    `);
    
    if (columns.length === 0) {
      // Add the column using raw SQL
      await sequelize.query(`
        ALTER TABLE schedules 
        ADD COLUMN day_limits JSON DEFAULT NULL;
      `);
      console.log("✓ day_limits column added successfully!");
    } else {
      console.log("✓ day_limits column already exists, skipping...");
    }

    // Verify the column was added
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'schedules' AND column_name = 'day_limits';
    `);
    
    if (results.length > 0) {
      console.log("✓ Verified: day_limits column exists");
      console.log("Column details:", results[0]);
    } else {
      console.log("⚠ Warning: Could not verify day_limits column");
    }

    console.log("\nMigration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

addDayLimitsColumn();
