import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

import { getEmployeeSchedulesFromTemplates } from '../services/scheduleTemplateService.js';
import ScheduleTemplate from '../models/scheduleTemplate.js';

async function debugTeamScheduleAssignment() {
  try {
    console.log("🔍 Debugging Team Schedule Assignment Issue");
    console.log("=" .repeat(50));
    
    console.log("\n📊 Getting schedules from template system...");
    const templateSchedules = await getEmployeeSchedulesFromTemplates();
    console.log(`Found ${templateSchedules.length} template schedules`);
    
    // Analyze template-based schedules
    console.log("\n🔍 Analyzing template-based schedules:");
    
    templateSchedules.forEach((schedule, index) => {
      console.log(`\n${index + 1}. Schedule ID: ${schedule.id}`);
      console.log(`   Employee: ${schedule.employee_id}`);
      console.log(`   Shift: ${schedule.shift_name}`);
      console.log(`   Template ID: ${schedule.template_id}`);
      console.log(`   Assigned By: ${schedule.assigned_by}`);
      console.log(`   Specific Date: ${schedule.specific_date}`);
      console.log(`   Days: ${JSON.stringify(schedule.days)}`);
    });
    
    // Check for schedules without assigned_by
    const schedulesWithoutAssignedBy = templateSchedules.filter(s => !s.assigned_by);
    if (schedulesWithoutAssignedBy.length > 0) {
      console.log(`\n⚠️ Found ${schedulesWithoutAssignedBy.length} template schedules without assigned_by field:`);
      schedulesWithoutAssignedBy.forEach(schedule => {
        console.log(`   - ${schedule.employee_id}: ${schedule.shift_name} (Template: ${schedule.template_id})`);
      });
    }
    
    // Check for schedules with assigned_by
    const schedulesWithAssignedBy = templateSchedules.filter(s => s.assigned_by);
    if (schedulesWithAssignedBy.length > 0) {
      console.log(`\n✅ Found ${schedulesWithAssignedBy.length} template schedules with assigned_by field:`);
      schedulesWithAssignedBy.forEach(schedule => {
        console.log(`   - ${schedule.employee_id}: ${schedule.shift_name} (Assigned by: ${schedule.assigned_by})`);
      });
    }
    
    // Also check the raw template data
    console.log("\n📋 Checking raw template data...");
    const templates = await ScheduleTemplate.findAll({
      where: { status: "Active" },
      order: [["createdAt", "DESC"]],
    });
    
    console.log(`Found ${templates.length} active templates`);
    
    templates.forEach((template, index) => {
      console.log(`\n${index + 1}. Template ID: ${template.id}`);
      console.log(`   Shift: ${template.shift_name}`);
      console.log(`   Department: ${template.department}`);
      console.log(`   Assigned Employees: ${template.assigned_employees}`);
      
      if (template.assigned_employees) {
        try {
          const assignments = JSON.parse(template.assigned_employees);
          console.log(`   Parsed Assignments:`, assignments);
        } catch (e) {
          console.log(`   Failed to parse assignments: ${e.message}`);
        }
      }
    });
    
    console.log("\n" + "=" .repeat(50));
    console.log("🔍 Debug complete");
    
  } catch (error) {
    console.error("❌ Error debugging team schedule assignment:", error);
  }
}

debugTeamScheduleAssignment();