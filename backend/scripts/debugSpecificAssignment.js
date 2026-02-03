import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

import { getEmployeeSchedulesFromTemplates } from '../services/scheduleTemplateService.js';
import Employee from '../models/employee.js';
import { Op } from 'sequelize';

async function debugSpecificAssignment() {
  try {
    console.log("🔍 Debugging Carl Pena & Charles Lopez Assignment Issue");
    console.log("=" .repeat(60));
    
    // Find all employees with similar names
    console.log("\n👥 Finding employees with Carl or Charles in name...");
    const employees = await Employee.findAll({
      where: {
        fullname: {
          [Op.or]: [
            { [Op.like]: '%Carl%' },
            { [Op.like]: '%Charles%' },
            { [Op.like]: '%Pena%' },
            { [Op.like]: '%Lopez%' }
          ]
        }
      }
    });
    
    console.log(`Found ${employees.length} matching employees:`);
    employees.forEach(emp => {
      console.log(`  - ${emp.fullname} (ID: ${emp.employee_id}, Dept: ${emp.department}, Position: ${emp.position})`);
    });
    
    // If no matches, show all employees to find the correct names
    if (employees.length === 0) {
      console.log("\n👥 No matches found. Showing all employees:");
      const allEmployees = await Employee.findAll({
        order: [['fullname', 'ASC']]
      });
      
      allEmployees.forEach(emp => {
        console.log(`  - ${emp.fullname} (ID: ${emp.employee_id}, Dept: ${emp.department}, Position: ${emp.position})`);
      });
    }
    
    // Get all template schedules
    console.log("\n📊 Getting all template schedules...");
    const templateSchedules = await getEmployeeSchedulesFromTemplates();
    
    console.log(`Found ${templateSchedules.length} template schedules`);
    
    // Show recent assignments (last 1 hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const recentAssignments = templateSchedules.filter(schedule => {
      if (!schedule.assigned_date) return false;
      const assignedDate = new Date(schedule.assigned_date);
      return assignedDate > oneHourAgo;
    });
    
    console.log(`\n⏰ Recent assignments (last 1 hour): ${recentAssignments.length}`);
    recentAssignments.forEach((schedule, index) => {
      const employee = employees.find(emp => emp.employee_id === schedule.employee_id);
      const employeeName = employee ? employee.fullname : schedule.employee_id;
      
      console.log(`  ${index + 1}. ${employeeName} (${schedule.employee_id}): ${schedule.shift_name}`);
      console.log(`     Assigned by: ${schedule.assigned_by}`);
      console.log(`     Assigned at: ${schedule.assigned_date}`);
      console.log(`     Template: ${schedule.template_id}`);
      console.log(`     Date: ${schedule.specific_date}`);
    });
    
    // Show all assignments by employee 003 (likely Charles Lopez)
    console.log(`\n🎯 All assignments made by employee 003:`);
    const assignmentsByEmployee003 = templateSchedules.filter(schedule => 
      schedule.assigned_by === '003'
    );
    
    assignmentsByEmployee003.forEach((schedule, index) => {
      const employee = employees.find(emp => emp.employee_id === schedule.employee_id);
      const employeeName = employee ? employee.fullname : schedule.employee_id;
      
      console.log(`  ${index + 1}. ${employeeName} (${schedule.employee_id}): ${schedule.shift_name}`);
      console.log(`     Template: ${schedule.template_id}`);
      console.log(`     Date: ${schedule.specific_date}`);
      console.log(`     Assigned at: ${schedule.assigned_date}`);
    });
    
    // Show assignments for employee 010 (likely Carl Pena based on Zone A)
    console.log(`\n👤 Assignments for employee 010 (Zone A Picker):`);
    const employee010Assignments = templateSchedules.filter(schedule => 
      schedule.employee_id === '010'
    );
    
    employee010Assignments.forEach((schedule, index) => {
      console.log(`  ${index + 1}. ${schedule.shift_name} (Template: ${schedule.template_id})`);
      console.log(`     Assigned by: ${schedule.assigned_by}`);
      console.log(`     Date: ${schedule.specific_date}`);
      console.log(`     Assigned at: ${schedule.assigned_date}`);
    });
    
    // Check if template 174 still exists
    console.log(`\n📋 Checking template 174 status...`);
    const { default: ScheduleTemplate } = await import('../models/scheduleTemplate.js');
    
    const template174 = await ScheduleTemplate.findByPk(174);
    if (template174) {
      console.log(`  Template 174 exists:`);
      console.log(`    Shift: ${template174.shift_name}`);
      console.log(`    Department: ${template174.department}`);
      console.log(`    Status: ${template174.status}`);
      console.log(`    Specific Date: ${template174.specific_date}`);
      console.log(`    Days: ${JSON.stringify(template174.days)}`);
    } else {
      console.log(`  ❌ Template 174 does not exist!`);
    }
    
    // Check what templates are available for Zone A department
    console.log(`\n📋 Available templates for Zone A department:`);
    const zoneATemplates = await ScheduleTemplate.findAll({
      where: { 
        department: 'Zone A',
        status: 'Active'
      }
    });
    
    console.log(`Found ${zoneATemplates.length} active Zone A templates:`);
    zoneATemplates.forEach(template => {
      console.log(`  - Template ${template.id}: ${template.shift_name} (${template.specific_date || 'No date'})`);
    });
    
    console.log("\n" + "=" .repeat(60));
    console.log("🔍 Debug complete");
    
  } catch (error) {
    console.error("❌ Error debugging specific assignment:", error);
  }
}

debugSpecificAssignment();

debugSpecificAssignment();