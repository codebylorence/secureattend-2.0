import sequelize from "../config/database.js";

const updateAttendanceStatusEnum = async () => {
  try {
    console.log("Updating attendance status enum to include Present, Late, Absent...");
    
    // MySQL/MariaDB: Modify the ENUM to include the new values
    // Keep old values for backward compatibility
    await sequelize.query(`
      ALTER TABLE attendances 
      MODIFY COLUMN status 
      ENUM('IN', 'COMPLETED', 'Present', 'Late', 'Absent') 
      DEFAULT 'Present'
    `);
    
    console.log("✅ Successfully updated attendance status enum!");
    
    // Optional: Migrate old statuses to new ones
    console.log("Migrating old status values...");
    
    // Migrate 'IN' to 'Present' (assuming they were on time)
    const [inResults] = await sequelize.query(`
      UPDATE attendances 
      SET status = 'Present' 
      WHERE status = 'IN'
    `);
    console.log(`  Migrated ${inResults.affectedRows || 0} 'IN' records to 'Present'`);
    
    // Migrate 'COMPLETED' to 'Present' (assuming they were on time)
    const [completedResults] = await sequelize.query(`
      UPDATE attendances 
      SET status = 'Present' 
      WHERE status = 'COMPLETED'
    `);
    console.log(`  Migrated ${completedResults.affectedRows || 0} 'COMPLETED' records to 'Present'`);
    
    console.log("✅ Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating enum:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
};

updateAttendanceStatusEnum();
