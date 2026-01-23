import { createTemplate } from "../services/scheduleTemplateService.js";
import ScheduleTemplate from "../models/scheduleTemplate.js";
import "../models/associations.js";

const testTemplateCreation = async () => {
  try {
    console.log("🧪 Testing template creation with auto team leader assignment...");
    
    // Create a test template for Zone B
    const templateData = {
      department: "Zone B",
      shift_name: "Test Shift",
      start_time: "09:00",
      end_time: "17:00",
      specific_date: "2026-01-25", // Tomorrow
      member_limit: 5,
      created_by: "test-admin"
    };
    
    console.log("📋 Creating template:", templateData);
    
    const template = await createTemplate(templateData);
    
    console.log(`✅ Template created with ID: ${template.id}`);
    
    // Check if team leader was auto-assigned
    const createdTemplate = await ScheduleTemplate.findByPk(template.id);
    
    if (createdTemplate.assigned_employees) {
      try {
        const assignments = JSON.parse(createdTemplate.assigned_employees);
        console.log(`📊 Auto-assignments (${assignments.length}):`);
        assignments.forEach(assignment => {
          console.log(`  - ${assignment.employee_id} (by ${assignment.assigned_by} on ${assignment.assigned_date})`);
        });
        
        // Check if Zone B team leader (006) was assigned
        const teamLeaderAssigned = assignments.find(a => a.employee_id === '006');
        if (teamLeaderAssigned) {
          console.log("✅ Zone B team leader (006) was auto-assigned during creation");
        } else {
          console.log("❌ Zone B team leader (006) was NOT auto-assigned");
        }
      } catch (e) {
        console.error("❌ Error parsing assignments:", e);
      }
    } else {
      console.log("❌ No assignments found - team leader was not auto-assigned");
    }
    
    // Clean up - delete the test template
    await ScheduleTemplate.destroy({ where: { id: template.id } });
    console.log("🧹 Test template cleaned up");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Run the test
testTemplateCreation().then(() => {
  console.log("\n✅ Template creation test completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});