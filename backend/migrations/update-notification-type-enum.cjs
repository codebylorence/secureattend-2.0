import sequelize from "../config/database.js";

const updateNotificationTypeEnum = async () => {
  try {
    console.log("Updating notification type enum to include 'sched_delete'...");
    
    // MySQL/MariaDB: Modify the ENUM to include the new value
    await sequelize.query(`
      ALTER TABLE notifications 
      MODIFY COLUMN type 
      ENUM('schedule_update', 'schedule_published', 'sched_delete', 'general') 
      NOT NULL 
      DEFAULT 'general'
    `);
    
    console.log("✅ Successfully updated notification type enum!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating enum:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
};

updateNotificationTypeEnum();
