import ScheduleTemplate from "../models/scheduleTemplate.js";
import "../models/associations.js";

const listAllSchedules = async () => {
  try {
    console.log("📋 Listing all schedules in the database...");
    
    const templates = await ScheduleTemplate.findAll({
      order: [["createdAt", "DESC"]]
    });
    
    console.log(`\n📊 Found ${templates.length} total schedules:`);
    
    templates.forEach((template, index) => {
      console.log(`\n${index + 1}. Template ID: ${template.id}`);
      console.log(`   Department: ${template.department}`);
      console.log(`   Shift: ${template.shift_name}`);
      console.log(`   Time: ${template.start_time} - ${template.end_time}`);
      console.log(`   Status: ${template.status}`);
      
      if (template.specific_date) {
        console.log(`   Specific Date: ${template.specific_date}`);
      } else if (template.days) {
        console.log(`   Days: ${JSON.stringify(template.days)}`);
      }
      
      console.log(`   Created: ${template.createdAt}`);
      console.log(`   Created By: ${template.created_by || 'Unknown'}`);
      
      // Check assignments
      if (template.assigned_employees) {
        try {
          const assignments = JSON.parse(template.assigned_employees);
          console.log(`   Assigned (${assignments.length}): ${assignments.map(a => a.employee_id).join(', ')}`);
        } catch (e) {
          console.log(`   Assigned: Error parsing`);
        }
      } else {
        console.log(`   Assigned: None`);
      }
    });
    
    // Group by status
    const activeCount = templates.filter(t => t.status === 'Active').length;
    const inactiveCount = templates.filter(t => t.status === 'Inactive').length;
    
    console.log(`\n📈 Summary:`);
    console.log(`   Active: ${activeCount}`);
    console.log(`   Inactive: ${inactiveCount}`);
    console.log(`   Total: ${templates.length}`);
    
    // Group by type
    const specificDateCount = templates.filter(t => t.specific_date).length;
    const legacyDaysCount = templates.filter(t => t.days && !t.specific_date).length;
    
    console.log(`\n📅 By Type:`);
    console.log(`   Specific Date: ${specificDateCount}`);
    console.log(`   Legacy Days: ${legacyDaysCount}`);
    
  } catch (error) {
    console.error("❌ Error listing schedules:", error);
  }
};

// Run the script
listAllSchedules().then(() => {
  console.log("\n✅ Schedule listing completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});