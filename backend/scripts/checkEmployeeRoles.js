import sequelize from "../config/database.js";
import User from "../models/user.js";
import Employee from "../models/employee.js";
// Import associations to ensure they're loaded
import "../models/associations.js";

async function checkEmployeeRoles() {
  try {
    console.log("🔍 Checking users and their roles...");
    
    // Get all users first
    const allUsers = await User.findAll({
      order: [['role', 'ASC'], ['username', 'ASC']]
    });
    
    console.log(`\n📊 Total users: ${allUsers.length}`);
    
    // Group by role
    const roleGroups = {};
    allUsers.forEach(user => {
      const role = user.role || 'no-role';
      if (!roleGroups[role]) roleGroups[role] = [];
      roleGroups[role].push(user);
    });
    
    console.log("\n📋 Users by role:");
    Object.keys(roleGroups).forEach(role => {
      console.log(`\n${role.toUpperCase()} (${roleGroups[role].length}):`);
      roleGroups[role].forEach((user, index) => {
        console.log(`  ${index + 1}. Username: ${user.username}, ID: ${user.id}, Employee ID: ${user.employeeId || 'None'}`);
      });
    });
    
    // Check specifically for supervisors and admins
    const supervisors = allUsers.filter(user => user.role === 'supervisor');
    const admins = allUsers.filter(user => user.role === 'admin');
    
    console.log(`\n🎯 Available for role-based scheduling:`);
    console.log(`   Supervisors: ${supervisors.length}`);
    console.log(`   Warehouse Admins: ${admins.length}`);
    
    if (supervisors.length === 0 || admins.length === 0) {
      console.log("\n⚠️ WARNING: Role-based scheduling requires both supervisors and warehouse admins!");
      console.log("   You need to create users with these roles or update existing user roles.");
      
      if (supervisors.length === 0) {
        console.log("\n💡 To create a supervisor, run:");
        console.log("   node scripts/createSupervisor.js");
      }
      
      if (admins.length === 0) {
        console.log("\n💡 To create an admin, run:");
        console.log("   node scripts/createAdmin.js");
      }
    } else {
      console.log("\n✅ System has both supervisors and admins - role-based scheduling should work!");
    }
    
  } catch (error) {
    console.error("❌ Error checking employee roles:", error);
  } finally {
    await sequelize.close();
  }
}

checkEmployeeRoles();