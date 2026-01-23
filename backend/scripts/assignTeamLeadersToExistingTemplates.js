import ScheduleTemplate from "../models/scheduleTemplate.js";
import User from "../models/user.js";
import Employee from "../models/employee.js";
import "../models/associations.js";

const assignTeamLeadersToExistingTemplates = async () => {
  try {
    console.log("🔧 Assigning team leaders to existing templates...");
    
    // Get all active templates without team leader assignments
    const templates = await ScheduleTemplate.findAll({
      where: { status: "Active" }
    });
    
    console.log(`📋 Found ${templates.length} active templates`);
    
    let updatedCount = 0;
    
    for (const template of templates) {
      try {
        // Check current assignments
        let currentAssignments = [];
        if (template.assigned_employees) {
          try {
            currentAssignments = JSON.parse(template.assigned_employees);
          } catch (e) {
            currentAssignments = [];
          }
        }
        
        // Find team leader for this department
        const teamLeaderUser = await User.findOne({
          where: { role: "teamleader" },
          include: [{
            model: Employee,
            as: "employee",
            where: { department: template.department }
          }]
        });
        
        if (teamLeaderUser && teamLeaderUser.employee) {
          const teamLeaderId = teamLeaderUser.employee.employee_id;
          
          // Check if team leader is already assigned
          const teamLeaderExists = currentAssignments.find(assignment => assignment.employee_id === teamLeaderId);
          
          if (!teamLeaderExists) {
            console.log(`👑 Assigning team leader ${teamLeaderId} to template ${template.id} (${template.department} - ${template.shift_name})`);
            
            const now = new Date().toISOString();
            const teamLeaderAssignment = {
              employee_id: teamLeaderId,
              assigned_date: now,
              assigned_by: "system-retroactive"
            };
            
            currentAssignments.unshift(teamLeaderAssignment); // Add team leader first
            
            await template.update({
              assigned_employees: JSON.stringify(currentAssignments)
            });
            
            updatedCount++;
          } else {
            console.log(`ℹ️ Team leader ${teamLeaderId} already assigned to template ${template.id}`);
          }
        } else {
          console.log(`⚠️ No team leader found for department: ${template.department} (template ${template.id})`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing template ${template.id}:`, error);
      }
    }
    
    console.log(`✅ Updated ${updatedCount} templates with team leader assignments`);
    
  } catch (error) {
    console.error("❌ Script failed:", error);
  }
};

// Run the script
assignTeamLeadersToExistingTemplates().then(() => {
  console.log("\n✅ Team leader assignment completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});