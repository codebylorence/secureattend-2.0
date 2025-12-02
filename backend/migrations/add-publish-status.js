import sequelize from "../config/database.js";

const addPublishStatusColumns = async () => {
  try {
    console.log("Adding publish_status columns to schedule_templates...");
    
    // Add publish_status column
    await sequelize.query(`
      ALTER TABLE schedule_templates 
      ADD COLUMN IF NOT EXISTS publish_status 
      ENUM('Draft', 'Published') 
      DEFAULT 'Published'
    `);
    
    // Add published_at column
    await sequelize.query(`
      ALTER TABLE schedule_templates 
      ADD COLUMN IF NOT EXISTS published_at 
      DATETIME NULL
    `);
    
    // Add published_by column
    await sequelize.query(`
      ALTER TABLE schedule_templates 
      ADD COLUMN IF NOT EXISTS published_by 
      VARCHAR(255) NULL
    `);
    
    console.log("✅ Successfully added publish_status columns!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding columns:", error);
    process.exit(1);
  }
};

addPublishStatusColumns();
