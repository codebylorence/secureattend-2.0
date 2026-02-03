import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

import Employee from '../models/employee.js';
import User from '../models/user.js';

async function debugManagementRoles() {
  try {
    console.log("🔍 Debugging Management Roles Assignment");
    console.log("=" .repeat(50));
    
    // Check all employees with management roles
    console.log("\n👥 Finding employees with management roles...");
    const allEmployees = await Employee.findAll({
      order: [['employee_id', 'ASC']]
    });
    
    console.log(`Found ${allEmployees.length} total employees`);
    
    // Check for supervisors and warehouse admins
    const supervisors = allEmployees.filter(emp => emp.position === 'Supervisor');
    const warehouseAdmins = allEmployees.filter(emp => emp.position === 'Warehouse Admin' || emp.position === 'Warehouse Manager');
    
    console.log(`\n📊 Management positions:`);
    console.log(`  Supervisors: ${supervisors.length}`);
    console.log(`  Warehouse Admins/Managers: ${warehouseAdmins.length}`);
    
    supervisors.forEach(emp => {
      console.log(`  - Supervisor: ${emp.fullname || emp.employee_id} (ID: ${emp.employee_id}, Dept: ${emp.department})`);
    });
    
    warehouseAdmins.forEach(emp => {
      console.log(`  - Warehouse Admin: ${emp.fullname || emp.employee_id} (ID: ${emp.employee_id}, Dept: ${emp.department})`);
    });
    
    // Check user roles
    console.log(`\n👤 Checking user roles...`);
    const allUsers = await User.findAll();
    
    const supervisorUsers = allUsers.filter(user => user.role === 'supervisor');
    const warehouseAdminUsers = allUsers.filter(user => user.role === 'warehouseadmin');
    
    console.log(`  Users with supervisor role: ${supervisorUsers.length}`);
    console.log(`  Users with warehouseadmin role: ${warehouseAdminUsers.length}`);
    
    supervisorUsers.forEach(user => {
      console.log(`  - Supervisor User: ${user.username} (Role: ${user.role})`);
    });
    
    warehouseAdminUsers.forEach(user => {
      console.log(`  - Warehouse Admin User: ${user.username} (Role: ${user.role})`);
    });
    
    // Check for mismatches between employee positions and user roles
    console.log(`\n🔍 Checking for mismatches...`);
    
    // Find employees with supervisor position but no supervisor user role
    const supervisorEmployeeIds = supervisors.map(emp => emp.employee_id);
    const supervisorUserEmployeeIds = [];
    
    for (const user of supervisorUsers) {
      // Find the employee record for this user
      const employee = allEmployees.find(emp => emp.employee_id === user.username || emp.employee_id === user.id);
      if (employee) {
        supervisorUserEmployeeIds.push(employee.employee_id);
      }
    }
    
    const supervisorsWithoutUserRole = supervisorEmployeeIds.filter(id => !supervisorUserEmployeeIds.includes(id));
    if (supervisorsWithoutUserRole.length > 0) {
      console.log(`  ⚠️ Supervisors without user role: ${supervisorsWithoutUserRole.join(', ')}`);
    }
    
    // Find employees with warehouse admin position but no warehouseadmin user role
    const warehouseAdminEmployeeIds = warehouseAdmins.map(emp => emp.employee_id);
    const warehouseAdminUserEmployeeIds = [];
    
    for (const user of warehouseAdminUsers) {
      // Find the employee record for this user
      const employee = allEmployees.find(emp => emp.employee_id === user.username || emp.employee_id === user.id);
      if (employee) {
        warehouseAdminUserEmployeeIds.push(employee.employee_id);
      }
    }
    
    const warehouseAdminsWithoutUserRole = warehouseAdminEmployeeIds.filter(id => !warehouseAdminUserEmployeeIds.includes(id));
    if (warehouseAdminsWithoutUserRole.length > 0) {
      console.log(`  ⚠️ Warehouse Admins without user role: ${warehouseAdminsWithoutUserRole.join(', ')}`);
    }
    
    // Check active status
    console.log(`\n📋 Active status check:`);
    const activeSupervisors = supervisors.filter(emp => emp.status === 'Active');
    const activeWarehouseAdmins = warehouseAdmins.filter(emp => emp.status === 'Active');
    
    console.log(`  Active Supervisors: ${activeSupervisors.length}/${supervisors.length}`);
    console.log(`  Active Warehouse Admins: ${activeWarehouseAdmins.length}/${warehouseAdmins.length}`);
    
    activeSupervisors.forEach(emp => {
      console.log(`  - Active Supervisor: ${emp.fullname || emp.employee_id} (ID: ${emp.employee_id})`);
    });
    
    activeWarehouseAdmins.forEach(emp => {
      console.log(`  - Active Warehouse Admin: ${emp.fullname || emp.employee_id} (ID: ${emp.employee_id})`);
    });
    
    console.log("\n" + "=" .repeat(50));
    console.log("🔍 Debug complete");
    
  } catch (error) {
    console.error("❌ Error debugging management roles:", error);
  }
}

debugManagementRoles();