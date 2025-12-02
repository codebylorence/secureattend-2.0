import sequelize from "./config/database.js";
import ScheduleDraft from "./models/scheduleDraft.js";

async function createScheduleDraftsTable() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    console.log("📝 Creating schedule_drafts table...");
    
    // Force sync to create the table
    await ScheduleDraft.sync({ force: false });
    
    console.log("✅ schedule_drafts table created successfully!\n");
    
    console.log("Table structure:");
    console.log("- id: Primary key");
    console.log("- employee_id: Employee to assign");
    console.log("- template_id: Schedule template reference");
    console.log("- days: Array of days");
    console.log("- assigned_by: Who created the assignment");
    console.log("- action: create/update/delete");
    console.log("- employee_schedule_id: Reference to existing schedule (for updates/deletes)");
    console.log("- status: pending/published/cancelled");
    console.log("- createdAt, updatedAt: Timestamps");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createScheduleDraftsTable();
