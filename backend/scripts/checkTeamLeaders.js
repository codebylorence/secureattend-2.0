import User from "../models/user.js";
import Employee from "../models/employee.js";
import "../models/associations.js"; // Import associations

const checkTeamLeaders = async () => {
  try {
    console.log("🔍 Checking team leaders in the database...");
    
    // Check users with teamleader role
    const teamLeaderUsers = await User.findAll({
      where: { role: "teamleader" },
      include: [{
        model: Employee,
        as: "employee",
        required: false
      }]
    });
    
    console.log(`👑 Found ${teamLeaderUsers.length} users with teamleader role:`);
    teamLeaderUsers.forEach(user => {
      console.log(`  - User ID: ${user.id}, Username: ${user.username}, Employee: ${user.employee?.employee_id || 'No employee linked'}, Department: ${user.employee?.department || 'N/A'}`);
    });
    
    // Check employees with Team Leader position
    const teamLeaderEmployees = await Employee.findAll({
      where: { position: "Team Leader" }
    });
    
    console.log(`\n👥 Found ${teamLeaderEmployees.length} employees with Team Leader position:`);
    teamLeaderEmployees.forEach(emp => {
      console.log(`  - Employee ID: ${emp.employee_id}, Name: ${emp.fullname || emp.firstname + ' ' + emp.lastname}, Department: ${emp.department}`);
    });
    
    // Check for mismatches
    console.log("\n🔍 Checking for mismatches...");
    for (const emp of teamLeaderEmployees) {
      const user = await User.findOne({
        include: [{
          model: Employee,
          as: "employee",
          where: { employee_id: emp.employee_id }
        }]
      });
      
      if (user) {
        if (user.role !== "teamleader") {
          console.log(`⚠️  Mismatch: Employee ${emp.employee_id} has Team Leader position but user role is "${user.role}"`);
        } else {
          console.log(`✅ Match: Employee ${emp.employee_id} has correct teamleader role`);
        }
      } else {
        console.log(`❌ Missing: Employee ${emp.employee_id} has Team Leader position but no user account`);
      }
    }
    
    // Check all departments and their team leaders
    console.log("\n🏢 Department team leader mapping:");
    const { Op } = await import('sequelize');
    const departments = await Employee.findAll({
      attributes: ['department'],
      group: ['department'],
      where: { department: { [Op.ne]: null } }
    });
    
    for (const dept of departments) {
      const deptTeamLeader = await User.findOne({
        where: { role: "teamleader" },
        include: [{
          model: Employee,
          as: "employee",
          where: { department: dept.department }
        }]
      });
      
      if (deptTeamLeader) {
        console.log(`  - ${dept.department}: ${deptTeamLeader.employee.employee_id} (${deptTeamLeader.employee.fullname || deptTeamLeader.employee.firstname + ' ' + deptTeamLeader.employee.lastname})`);
      } else {
        console.log(`  - ${dept.department}: ❌ No team leader found`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error checking team leaders:", error);
  }
};

// Run the check
checkTeamLeaders().then(() => {
  console.log("\n✅ Team leader check completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});