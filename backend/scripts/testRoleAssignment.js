import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testRoleAssignment() {
  try {
    console.log("🧪 Testing role-based assignment...");
    
    // First, get available employees
    console.log("\n1. Fetching employees...");
    const employeesResponse = await axios.get(`${API_BASE}/employees`);
    const employees = employeesResponse.data;
    
    const supervisors = employees.filter(emp => emp.role === 'supervisor');
    const admins = employees.filter(emp => emp.role === 'admin');
    
    console.log(`   Found ${supervisors.length} supervisors and ${admins.length} admins`);
    
    if (supervisors.length === 0 || admins.length === 0) {
      console.log("❌ Cannot test - need both supervisors and admins");
      return;
    }
    
    // Get shift templates
    console.log("\n2. Fetching shift templates...");
    const templatesResponse = await axios.get(`${API_BASE}/shift-templates`);
    const shiftTemplates = templatesResponse.data;
    
    console.log(`   Found ${shiftTemplates.length} shift templates`);
    
    if (shiftTemplates.length === 0) {
      console.log("❌ Cannot test - need at least one shift template");
      return;
    }
    
    // Test assignment
    const supervisor = supervisors[0];
    const admin = admins[0];
    const template = shiftTemplates[0];
    
    console.log(`\n3. Testing assignment:`);
    console.log(`   Supervisor: ${supervisor.fullname} (${supervisor.employee_id})`);
    console.log(`   Admin: ${admin.fullname} (${admin.employee_id})`);
    console.log(`   Shift: ${template.name} (${template.start_time} - ${template.end_time})`);
    
    // Create supervisor assignment
    console.log("\n4. Assigning supervisor...");
    const supervisorAssignment = {
      employee_id: supervisor.employee_id,
      shift_name: template.name,
      start_time: template.start_time.substring(0, 5),
      end_time: template.end_time.substring(0, 5),
      days: ["Monday"],
      assigned_by: "test-script"
    };
    
    const supervisorResult = await axios.post(`${API_BASE}/employee-schedules/assign`, supervisorAssignment);
    console.log(`   ✅ Supervisor assigned: ${supervisorResult.data.message}`);
    
    // Create admin assignment
    console.log("\n5. Assigning warehouse admin...");
    const adminAssignment = {
      employee_id: admin.employee_id,
      shift_name: template.name,
      start_time: template.start_time.substring(0, 5),
      end_time: template.end_time.substring(0, 5),
      days: ["Monday"],
      assigned_by: "test-script"
    };
    
    const adminResult = await axios.post(`${API_BASE}/employee-schedules/assign`, adminAssignment);
    console.log(`   ✅ Warehouse admin assigned: ${adminResult.data.message}`);
    
    console.log("\n🎉 Role-based assignment test completed successfully!");
    console.log("   Both supervisor and warehouse admin have been assigned to Monday shift.");
    console.log("   Check the frontend Role-Based Scheduling page to see the assignments.");
    
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testRoleAssignment();