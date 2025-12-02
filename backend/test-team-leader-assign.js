import sequelize from "./config/database.js";
import User from "./models/user.js";
import Employee from "./models/employee.js";
import EmployeeSchedule from "./models/employeeSchedule.js";
import ScheduleTemplate from "./models/scheduleTemplate.js";

const testTeamLeaderAssignment = async () => {
  try {
    console.log("🧪 Testing team leader auto-assignment...\n");
    
    // Step 1: Find a published template
    const template = await ScheduleTemplate.findOne({
      where: { publish_status: "Published" }
    });
    
    if (!template) {
      console.log("❌ No published templates found");
      process.exit(1);
    }
    
    console.log(`✅ Found template: ${template.department} - ${template.shift_name}`);
    console.log(`   Template ID: ${template.id}`);
    console.log(`   Days: ${JSON.stringify(template.days)}`);
    
    // Step 2: Find team leader for this department
    const teamLeaderUser = await User.findOne({
      where: { role: "teamleader" },
      include: [{
        model: Employee,
        as: "employee",
        where: { department: template.department }
      }]
    });
    
    if (!teamLeaderUser || !teamLeaderUser.employee) {
      console.log(`❌ No team leader found for department: ${template.department}`);
      process.exit(1);
    }
    
    console.log(`✅ Found team leader: ${teamLeaderUser.employee.fullname}`);
    console.log(`   Employee ID: ${teamLeaderUser.employee.employee_id}`);
    console.log(`   Department: ${teamLeaderUser.employee.department}`);
    
    // Step 3: Check if already assigned
    const existingAssignment = await EmployeeSchedule.findOne({
      where: {
        employee_id: teamLeaderUser.employee.employee_id,
        template_id: template.id
      }
    });
    
    if (existingAssignment) {
      console.log(`ℹ️  Team leader already assigned (ID: ${existingAssignment.id})`);
    } else {
      console.log(`✅ Team leader not yet assigned - will create assignment`);
      
      // Step 4: Create assignment
      const newAssignment = await EmployeeSchedule.create({
        employee_id: teamLeaderUser.employee.employee_id,
        template_id: template.id,
        days: template.days,
        assigned_by: "admin"
      });
      
      console.log(`✅ Created assignment successfully!`);
      console.log(`   Assignment ID: ${newAssignment.id}`);
      console.log(`   Employee: ${teamLeaderUser.employee.employee_id}`);
      console.log(`   Template: ${template.id}`);
      console.log(`   Days: ${JSON.stringify(newAssignment.days)}`);
    }
    
    // Step 5: Verify assignment exists
    const verifyAssignment = await EmployeeSchedule.findOne({
      where: {
        employee_id: teamLeaderUser.employee.employee_id,
        template_id: template.id
      }
    });
    
    if (verifyAssignment) {
      console.log(`\n✅ VERIFICATION PASSED: Assignment exists in database`);
    } else {
      console.log(`\n❌ VERIFICATION FAILED: Assignment not found in database`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

testTeamLeaderAssignment();
