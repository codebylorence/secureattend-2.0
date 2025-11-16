import sequelize from "./config/database.js";
import Schedule from "./models/schedule.js";

async function addScheduleDateColumn() {
  try {
    console.log("🔄 Adding schedule_date column to Schedules table...");
    
    // Sync the database with alter: true to add the new column
    await sequelize.sync({ alter: true });
    
    console.log("✅ Successfully added schedule_date column!");
    console.log("📊 Database schema updated.");
    
    // Check existing schedules
    const scheduleCount = await Schedule.count();
    console.log(`📋 Total schedules in database: ${scheduleCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding schedule_date column:", error);
    process.exit(1);
  }
}

addScheduleDateColumn();
