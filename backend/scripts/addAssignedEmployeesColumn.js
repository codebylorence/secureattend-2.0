import sequelize from "../config/database.js";

async function addAssignedEmployeesColumn() {
  try {
    console.log("Adding assigned_employees column to schedule_templates table...");
    
    await sequelize.query(`
      ALTER TABLE schedule_templates 
      ADD COLUMN assigned_employees JSON NULL 
      COMMENT 'Array of employee assignments: [{employee_id: "TSI00123", assigned_date: "2025-01-25", assigned_by: "admin"}]'
    `);
    
    console.log("✅ Successfully added assigned_employees column");
    process.exit(0);
  } catch (error) {
    if (error.message.includes("Duplicate column name")) {
      console.log("✅ Column already exists, skipping...");
      process.exit(0);
    } else {
      console.error("❌ Error:", error);
      process.exit(1);
    }
  }
}

addAssignedEmployeesColumn();