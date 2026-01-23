import { assignEmployeesToTemplate } from "../services/scheduleTemplateService.js";
import ScheduleTemplate from "../models/scheduleTemplate.js";
import "../models/associations.js";

const testAssignment = async () => {
  try {
    console.log("🧪 Testing employee assignment process...");
    
    // Find a template to test with
    const template = await ScheduleTemplate.findOne({
      where: { status: "Active" },
      order: [["createdAt", "DESC"]]
    });
    
    if (!template) {
      console.log("❌ No active templates found. Please create a schedule first.");
      return;
    }
    
    console.log(`📋 Found template: ${template.id} - ${template.department} - ${template.shift_name}`);
    console.log(`📅 Date: ${template.specific_date || 'Legacy days: ' + JSON.stringify(template.days)}`);
    console.log(`⏰ Time: ${template.start_time} - ${template.end_time}`);
    
    // Check current assignments
    let currentAssignments = [];
    try {
      currentAssignments = template.assigned_employees ? JSON.parse(template.assigned_employees) : [];
    } catch (e) {
      currentAssignments = [];
    }
    
    console.log(`👥 Current assignments: ${currentAssignments.length}`);
    currentAssignments.forEach(assignment => {
      console.log(`  - ${assignment.employee_id} (assigned by ${assignment.assigned_by} on ${assignment.assigned_date})`);
    });
    
    // Test assignment with a dummy employee
    console.log("\n🧪 Testing assignment with employee '999' (dummy)...");
    
    try {
      const result = await assignEmployeesToTemplate(template.id, ['999'], 'test-admin');
      console.log("✅ Assignment completed successfully");
      
      // Check the result
      const updatedTemplate = await ScheduleTemplate.findByPk(template.id);
      const newAssignments = JSON.parse(updatedTemplate.assigned_employees || '[]');
      
      console.log(`📊 New assignment count: ${newAssignments.length}`);
      newAssignments.forEach(assignment => {
        console.log(`  - ${assignment.employee_id} (assigned by ${assignment.assigned_by} on ${assignment.assigned_date})`);
      });
      
    } catch (error) {
      console.error("❌ Assignment failed:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Run the test
testAssignment().then(() => {
  console.log("\n✅ Test completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});