import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

import { getEmployeeSchedulesFromTemplates } from '../services/scheduleTemplateService.js';
import ScheduleTemplate from '../models/scheduleTemplate.js';

async function testTeamScheduleFiltering() {
  try {
    console.log("🔍 Testing Team Schedule Filtering Logic");
    console.log("=" .repeat(50));
    
    // Simulate the current user (Charles Lopez = Employee 003)
    const currentUser = {
      employee: {
        employee_id: '003',
        department: 'Zone A'
      }
    };
    
    console.log("👤 Current user:", currentUser);
    
    // Get templates for Zone A (simulating fetchTemplates)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    console.log("📅 Today's date:", todayStr);
    
    const allTemplates = await ScheduleTemplate.findAll({
      where: { 
        department: 'Zone A',
        status: 'Active'
      },
      order: [["createdAt", "DESC"]],
    });
    
    // Filter to current and future templates (simulating the filtering in fetchTemplates)
    const availableTemplates = allTemplates.filter(template => {
      if (template.specific_date) {
        return template.specific_date >= todayStr;
      }
      return false;
    });
    
    console.log(`📋 All Zone A templates: ${allTemplates.length}`);
    console.log(`📋 Available templates (today+future): ${availableTemplates.length}`);
    
    availableTemplates.forEach(template => {
      console.log(`  - Template ${template.id}: ${template.shift_name} (${template.specific_date})`);
    });
    
    // Get all assigned schedules
    const allSchedules = await getEmployeeSchedulesFromTemplates();
    
    // Filter for Zone A department schedules
    const zoneASchedules = allSchedules.filter(schedule => {
      return schedule.template && schedule.template.department === 'Zone A';
    });
    
    console.log(`\n📊 All Zone A schedules: ${zoneASchedules.length}`);
    
    // Apply the Team Schedule filtering logic
    const teamMemberSchedules = zoneASchedules.filter(schedule => {
      // Exclude the team leader's own schedule
      if (schedule.employee_id === currentUser.employee.employee_id) {
        console.log(`  ❌ Excluded ${schedule.employee_id}: Own schedule`);
        return false;
      }
      
      // Only show schedules that have a template_id
      if (!schedule.template_id) {
        console.log(`  ❌ Excluded ${schedule.employee_id}: No template_id`);
        return false;
      }
      
      // Check if assigned by team leader OR admin
      const wasAssignedByCurrentUser = schedule.assigned_by === currentUser.employee.employee_id;
      const wasAssignedByTeamLeaderRole = schedule.assigned_by === "teamleader";
      const wasAssignedByAdmin = schedule.assigned_by === "admin";
      
      const wasAssignedByAuthorizedUser = schedule.assigned_by && 
        (wasAssignedByCurrentUser || wasAssignedByTeamLeaderRole || wasAssignedByAdmin);
      
      if (!wasAssignedByAuthorizedUser) {
        console.log(`  ❌ Excluded ${schedule.employee_id}: Not assigned by authorized user (assigned_by: ${schedule.assigned_by})`);
        return false;
      }
      
      // Check if template exists in available templates
      const templateExists = availableTemplates.some(template => template.id === schedule.template_id);
      
      if (!templateExists) {
        console.log(`  ❌ Excluded ${schedule.employee_id}: Template ${schedule.template_id} not in available templates`);
        return false;
      }
      
      console.log(`  ✅ Included ${schedule.employee_id}: ${schedule.shift_name} (Template: ${schedule.template_id})`);
      return true;
    });
    
    console.log(`\n📋 Final filtered schedules: ${teamMemberSchedules.length}`);
    teamMemberSchedules.forEach(schedule => {
      console.log(`  - ${schedule.employee_id}: ${schedule.shift_name} (Template: ${schedule.template_id}, Date: ${schedule.specific_date})`);
    });
    
    // Specifically check for multiple assignments to the same template
    console.log(`\n🎯 Checking Template 192 assignments:`);
    const template192Assignments = allSchedules.filter(s => s.template_id === 192);
    console.log(`Found ${template192Assignments.length} assignments to Template 192:`);
    
    template192Assignments.forEach((schedule, index) => {
      console.log(`  ${index + 1}. Employee ${schedule.employee_id}`);
      console.log(`     Assigned by: ${schedule.assigned_by}`);
      console.log(`     Assigned at: ${schedule.assigned_date}`);
      console.log(`     Date: ${schedule.specific_date}`);
    });
    
    console.log("\n" + "=" .repeat(50));
    console.log("🔍 Test complete");
    
  } catch (error) {
    console.error("❌ Error testing team schedule filtering:", error);
  }
}

testTeamScheduleFiltering();