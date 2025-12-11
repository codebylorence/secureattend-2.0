import User from "../models/user.js";
import Employee from "../models/employee.js";

/**
 * Fix team leaders who were registered through the registration system
 * and have the wrong role (employee instead of teamleader)
 */
export const fixTeamLeaderRoles = async () => {
  try {
    console.log("🔍 Starting team leader role fix...");
    
    // Find all users with employee role who are actually team leaders
    const usersToFix = await User.findAll({
      where: { role: "employee" },
      include: [{
        model: Employee,
        as: "employee",
        where: { position: "Team Leader" }
      }]
    });
    
    console.log(`📋 Found ${usersToFix.length} team leaders with incorrect role`);
    
    let fixedCount = 0;
    
    for (const user of usersToFix) {
      console.log(`🔧 Fixing role for: ${user.employee.fullname} (${user.employee.employee_id})`);
      
      await user.update({ role: "teamleader" });
      fixedCount++;
      
      console.log(`✅ Updated ${user.username} role to teamleader`);
    }
    
    console.log(`🎉 Fixed ${fixedCount} team leader roles`);
    return { success: true, fixed: fixedCount };
    
  } catch (error) {
    console.error("❌ Error fixing team leader roles:", error);
    return { success: false, error: error.message };
  }
};

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixTeamLeaderRoles().then((result) => {
    console.log("Fix completed:", result);
    process.exit(0);
  });
}