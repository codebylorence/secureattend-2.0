import { getTemplatesByDepartment } from "../services/scheduleTemplateService.js";
import "../models/associations.js";

const testTeamLeaderTemplates = async () => {
  try {
    console.log("🧪 Testing team leader template visibility...");
    
    // Test for each department
    const departments = ["Zone A", "Zone B", "Zone C", "Zone D"];
    
    for (const department of departments) {
      console.log(`\n🏢 Testing ${department}:`);
      
      const templates = await getTemplatesByDepartment(department);
      console.log(`📋 Found ${templates.length} templates for ${department}`);
      
      templates.forEach(template => {
        let assignedCount = 0;
        let teamLeaderAssigned = false;
        
        if (template.assigned_employees) {
          try {
            const assignments = typeof template.assigned_employees === 'string' 
              ? JSON.parse(template.assigned_employees) 
              : template.assigned_employees;
            assignedCount = assignments.length;
            
            // Check if team leader is assigned (different for each zone)
            const teamLeaderIds = { "Zone A": "003", "Zone B": "006", "Zone C": "001", "Zone D": "020" };
            const expectedTeamLeader = teamLeaderIds[department];
            teamLeaderAssigned = assignments.some(a => a.employee_id === expectedTeamLeader);
          } catch (e) {
            assignedCount = 0;
          }
        }
        
        console.log(`  📅 Template ${template.id}: ${template.shift_name}`);
        console.log(`     Date: ${template.specific_date || 'Legacy: ' + JSON.stringify(template.days)}`);
        console.log(`     Time: ${template.start_time} - ${template.end_time}`);
        console.log(`     Assigned: ${assignedCount} (Team Leader: ${teamLeaderAssigned ? '✅' : '❌'})`);
      });
      
      if (templates.length === 0) {
        console.log(`  ℹ️ No templates found for ${department}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Run the test
testTeamLeaderTemplates().then(() => {
  console.log("\n✅ Team leader template visibility test completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});