import { createTemplate, assignEmployeesToTemplate } from "../services/scheduleTemplateService.js";
import { getAllEmployees } from "../services/employeeService.js";
import sequelize from "../config/database.js";
// Import associations to ensure they're loaded
import "../models/associations.js";

async function testRoleBasedScheduling() {
  try {
    console.log("🧪 Testing role-based scheduling with specific dates...");
    
    // Get available employees
    const employees = await getAllEmployees();
    const supervisors = employees.filter(emp => emp.user?.role === 'supervisor');
    const admins = employees.filter(emp => emp.user?.role === 'admin');
    
    console.log(`   Found ${supervisors.length} supervisors and ${admins.length} admins`);
    
    if (supervisors.length === 0 || admins.length === 0) {
      console.log("❌ Cannot test - need both supervisors and admins");
      return;
    }
    
    // Create a role-based template for a specific date
    const testDate = '2025-01-27'; // Monday
    const supervisor = supervisors[0];
    const admin = admins[0];
    
    console.log(`\n📅 Creating role-based template for ${testDate}`);
    console.log(`   Supervisor: ${supervisor.fullname} (${supervisor.employee_id})`);
    console.log(`   Admin: ${admin.fullname} (${admin.employee_id})`);
    
    // Create template
    const template = await createTemplate({
      department: 'Role-Based',
      shift_name: 'Morning Shift',
      start_time: '08:00',
      end_time: '17:00',
      specific_date: testDate,
      member_limit: 2,
      created_by: 'test-script'
    });
    
    console.log(`✅ Template created with ID: ${template.id}`);
    
    // Assign both employees to the template
    await assignEmployeesToTemplate(
      template.id, 
      [supervisor.employee_id, admin.employee_id], 
      'test-script'
    );
    
    console.log(`✅ Both employees assigned to template`);
    
    console.log("\n🎉 Role-based scheduling test completed successfully!");
    console.log("   Check the following:");
    console.log("   1. Role-Based Scheduling calendar should show the assignment");
    console.log("   2. View Schedules page should show both employees for the date");
    console.log("   3. Both supervisor and admin should see their assignment");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await sequelize.close();
  }
}

testRoleBasedScheduling();