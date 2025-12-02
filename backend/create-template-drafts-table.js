import sequelize from "./config/database.js";
import TemplateDraft from "./models/templateDraft.js";

async function createTemplateDraftsTable() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    console.log("📝 Creating template_drafts table...");
    
    await TemplateDraft.sync({ force: false });
    
    console.log("✅ template_drafts table created successfully!\n");
    
    console.log("Table structure:");
    console.log("- id: Primary key");
    console.log("- template_id: Reference to existing template (null for new)");
    console.log("- department: Zone/Department name");
    console.log("- shift_name: Shift name");
    console.log("- start_time, end_time: Shift times");
    console.log("- days: Array of days");
    console.log("- member_limit: Default member limit");
    console.log("- day_limits: Per-day limits");
    console.log("- created_by: Who created the change");
    console.log("- action: create/update/delete");
    console.log("- status: pending/published/cancelled");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createTemplateDraftsTable();
