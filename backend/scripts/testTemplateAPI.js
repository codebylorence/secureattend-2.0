import { getAllTemplates } from "../services/scheduleTemplateService.js";
import "../models/associations.js";

const testTemplateAPI = async () => {
  try {
    console.log("🧪 Testing template API endpoint...");
    
    const templates = await getAllTemplates();
    
    console.log(`📊 Found ${templates.length} templates`);
    
    templates.forEach(template => {
      console.log(`\n📋 Template ${template.id}:`);
      console.log(`  - Department: ${template.department}`);
      console.log(`  - Shift: ${template.shift_name}`);
      console.log(`  - Date: ${template.specific_date || 'Legacy days: ' + JSON.stringify(template.days)}`);
      console.log(`  - Time: ${template.start_time} - ${template.end_time}`);
      console.log(`  - Status: ${template.status}`);
      
      if (template.assigned_employees) {
        try {
          const assignments = typeof template.assigned_employees === 'string' 
            ? JSON.parse(template.assigned_employees) 
            : template.assigned_employees;
          
          console.log(`  - Assigned employees (${assignments.length}):`);
          assignments.forEach(assignment => {
            console.log(`    * ${assignment.employee_id} (by ${assignment.assigned_by} on ${assignment.assigned_date})`);
          });
        } catch (e) {
          console.log(`  - Assigned employees: ERROR parsing - ${template.assigned_employees}`);
        }
      } else {
        console.log(`  - Assigned employees: None`);
      }
    });
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Run the test
testTemplateAPI().then(() => {
  console.log("\n✅ API test completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});