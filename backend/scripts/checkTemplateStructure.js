import { getAllTemplates } from "../services/scheduleTemplateService.js";
import sequelize from "../config/database.js";

async function checkTemplateStructure() {
  try {
    console.log("🔍 Checking template structure for role-based templates...");
    
    const templates = await getAllTemplates();
    const roleBasedTemplates = templates.filter(t => t.department === 'Role-Based');
    
    console.log(`\n📊 Found ${roleBasedTemplates.length} role-based templates`);
    
    roleBasedTemplates.forEach((template, index) => {
      console.log(`\n${index + 1}. Template ID: ${template.id}`);
      console.log(`   Department: ${template.department}`);
      console.log(`   Shift: ${template.shift_name}`);
      console.log(`   Date: ${template.specific_date}`);
      console.log(`   Time: ${template.start_time} - ${template.end_time}`);
      
      if (template.assigned_employees) {
        console.log(`   Assigned Employees Type: ${typeof template.assigned_employees}`);
        
        try {
          const assignments = typeof template.assigned_employees === 'string' 
            ? JSON.parse(template.assigned_employees) 
            : template.assigned_employees;
          
          console.log(`   Assignments Count: ${Array.isArray(assignments) ? assignments.length : 'Not an array'}`);
          
          if (Array.isArray(assignments)) {
            assignments.forEach((assignment, i) => {
              console.log(`     ${i + 1}. Employee ID: ${assignment.employee_id}, Assigned By: ${assignment.assigned_by}`);
            });
          }
        } catch (error) {
          console.log(`   ❌ Error parsing assignments: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️ No assigned employees`);
      }
    });
    
    if (roleBasedTemplates.length === 0) {
      console.log("\n💡 No role-based templates found. Create one using the frontend or run testRoleBasedScheduling.js");
    }
    
  } catch (error) {
    console.error("❌ Error checking template structure:", error);
  } finally {
    await sequelize.close();
  }
}

checkTemplateStructure();