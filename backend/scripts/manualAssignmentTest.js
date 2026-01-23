import { assignEmployeesToTemplate } from "../services/scheduleTemplateService.js";
import ScheduleTemplate from "../models/scheduleTemplate.js";
import Employee from "../models/employee.js";
import { Op } from "sequelize";
import "../models/associations.js";

const manualAssignmentTest = async () => {
  try {
    console.log("🧪 Manual assignment test...");
    
    // Find Zone A template for today
    const template = await ScheduleTemplate.findOne({
      where: { 
        department: "Zone A",
        specific_date: "2026-01-24",
        status: "Active"
      }
    });
    
    if (!template) {
      console.log("❌ No Zone A template found for 2026-01-24");
      return;
    }
    
    console.log(`📋 Found template: ${template.id} - ${template.department} - ${template.shift_name}`);
    
    // Find some regular employees from Zone A
    const employees = await Employee.findAll({
      where: { 
        department: "Zone A",
        position: { [Op.not]: "Team Leader" }
      },
      limit: 2
    });
    
    console.log(`👥 Found ${employees.length} regular employees in Zone A:`);
    employees.forEach(emp => {
      console.log(`  - ${emp.employee_id}: ${emp.fullname || emp.firstname + ' ' + emp.lastname} (${emp.position})`);
    });
    
    if (employees.length === 0) {
      console.log("❌ No regular employees found in Zone A");
      return;
    }
    
    // Assign the first employee
    const employeeToAssign = employees[0];
    console.log(`\n🎯 Assigning employee: ${employeeToAssign.employee_id}`);
    
    const result = await assignEmployeesToTemplate(
      template.id, 
      [employeeToAssign.employee_id], 
      'manual-test'
    );
    
    console.log("✅ Assignment completed");
    
    // Check the result
    const updatedTemplate = await ScheduleTemplate.findByPk(template.id);
    const assignments = JSON.parse(updatedTemplate.assigned_employees || '[]');
    
    console.log(`📊 Final assignments (${assignments.length}):`);
    assignments.forEach(assignment => {
      console.log(`  - ${assignment.employee_id} (by ${assignment.assigned_by} on ${assignment.assigned_date})`);
    });
    
    // Check if team leader was auto-assigned
    const teamLeaderAssigned = assignments.find(a => a.employee_id === '003'); // Zone A team leader
    if (teamLeaderAssigned) {
      console.log("✅ Team leader 003 was auto-assigned");
    } else {
      console.log("❌ Team leader 003 was NOT auto-assigned");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Run the test
manualAssignmentTest().then(() => {
  console.log("\n✅ Manual assignment test completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});