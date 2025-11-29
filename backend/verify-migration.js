import sequelize from "./config/database.js";
import ScheduleTemplate from "./models/scheduleTemplate.js";
import EmployeeSchedule from "./models/employeeSchedule.js";
import "./models/associations.js";

async function verifyMigration() {
  try {
    console.log("🔍 Verifying migration...\n");

    // Check templates
    const templates = await ScheduleTemplate.findAll();
    console.log(`✅ Found ${templates.length} templates:`);
    templates.forEach(t => {
      console.log(`   - ${t.shift_name} (${t.department}): ${t.start_time} - ${t.end_time}`);
      console.log(`     Days: ${t.days.join(", ")}`);
      if (t.day_limits) {
        console.log(`     Limits: ${JSON.stringify(t.day_limits)}`);
      }
    });

    // Check employee schedules with template data
    console.log(`\n✅ Found ${await EmployeeSchedule.count()} employee schedules:`);
    const schedules = await EmployeeSchedule.findAll({
      include: [{
        model: ScheduleTemplate,
        as: "template",
      }],
    });
    
    schedules.forEach(s => {
      console.log(`   - Employee ${s.employee_id}:`);
      console.log(`     Shift: ${s.template.shift_name}`);
      console.log(`     Time: ${s.template.start_time} - ${s.template.end_time}`);
      console.log(`     Days: ${s.days.join(", ")}`);
    });

    console.log("\n✅ Migration verification complete!");
    console.log("\n📋 Next steps:");
    console.log("   1. Start the server: npm start");
    console.log("   2. Test endpoints with Postman/Thunder Client");
    console.log("   3. Proceed to Phase 2 (Frontend updates)");

  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await sequelize.close();
  }
}

verifyMigration();
