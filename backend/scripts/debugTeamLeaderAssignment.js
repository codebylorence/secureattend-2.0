import sequelize from "../config/database.js";
import User from "../models/user.js";
import Employee from "../models/employee.js";
import ScheduleTemplate from "../models/scheduleTemplate.js";

async function debugTeamLeaderAssignment() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Check all team leaders
    console.log("\n👥 Checking all team leaders:");
    const teamLeaders = await User.findAll({
      where: { role: "teamleader" },
      include: [{
        model: Employee,
        as: "employee",
        required: false
      }]
    });

    console.log(`Found ${teamLeaders.length} team leader(s):`);
    teamLeaders.forEach(tl => {
      console.log(`  - User ID: ${tl.id}, Username: ${tl.username}, Role: ${tl.role}`);
      console.log(`    employeeId (FK): ${tl.employeeId}`);
      if (tl.employee) {
        console.log(`    Employee: ${tl.employee.firstname} ${tl.employee.lastname}`);
        console.log(`    Employee ID: ${tl.employee.employee_id}`);
        console.log(`    Department: ${tl.employee.department}`);
        console.log(`    Position: ${tl.employee.position}`);
      } else {
        console.log(`    ⚠️ No employee record linked!`);
      }
    });

    // Check Fernando specifically
    console.log("\n🔍 Checking Fernando specifically:");
    const fernando = await User.findOne({
      where: { username: "fernando" },
      include: [{
        model: Employee,
        as: "employee"
      }]
    });

    if (fernando) {
      console.log("Fernando found:");
      console.log(`  User ID: ${fernando.id}`);
      console.log(`  Username: ${fernando.username}`);
      console.log(`  Role: ${fernando.role}`);
      console.log(`  employeeId (FK): ${fernando.employeeId}`);
      if (fernando.employee) {
        console.log(`  Employee ID: ${fernando.employee.employee_id}`);
        console.log(`  Name: ${fernando.employee.firstname} ${fernando.employee.lastname}`);
        console.log(`  Department: ${fernando.employee.department}`);
        console.log(`  Position: ${fernando.employee.position}`);
      }
    } else {
      console.log("❌ Fernando not found");
    }

    // Check Zone A templates
    console.log("\n📋 Checking Zone A templates:");
    const zoneATemplates = await ScheduleTemplate.findAll({
      where: { 
        department: "Zone A",
        status: "Active"
      }
    });

    console.log(`Found ${zoneATemplates.length} Zone A template(s):`);
    zoneATemplates.forEach(template => {
      console.log(`  Template ID: ${template.id}`);
      console.log(`  Shift: ${template.shift_name}`);
      console.log(`  Date: ${template.specific_date}`);
      console.log(`  Assigned employees: ${template.assigned_employees || 'null'}`);
      
      if (template.assigned_employees) {
        try {
          const assignments = JSON.parse(template.assigned_employees);
          console.log(`  Parsed assignments (${assignments.length}):`);
          assignments.forEach(a => {
            console.log(`    - ${a.employee_id} (assigned by ${a.assigned_by})`);
          });
        } catch (e) {
          console.log(`  ⚠️ Failed to parse assigned_employees`);
        }
      }
    });

    // Test the query used in auto-assignment
    console.log("\n🧪 Testing auto-assignment query for Zone A:");
    const testQuery = await User.findOne({
      where: { role: "teamleader" },
      include: [{
        model: Employee,
        as: "employee",
        where: { department: "Zone A" }
      }]
    });

    if (testQuery) {
      console.log("✅ Query found team leader:");
      console.log(`  User: ${testQuery.username}`);
      console.log(`  Employee ID: ${testQuery.employee.employee_id}`);
      console.log(`  Department: ${testQuery.employee.department}`);
    } else {
      console.log("❌ Query did not find team leader for Zone A");
      console.log("This is why auto-assignment is failing!");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

debugTeamLeaderAssignment();
