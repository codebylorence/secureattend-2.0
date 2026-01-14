import sequelize from "../config/database.js";
import User from "../models/user.js";

async function checkSupervisors() {
  try {
    console.log("🔍 Checking for supervisor users...");
    
    const supervisors = await User.findAll({
      where: { role: 'supervisor' }
    });
    
    console.log(`📊 Found ${supervisors.length} supervisor users:`);
    
    supervisors.forEach((supervisor, index) => {
      console.log(`${index + 1}. ID: ${supervisor.id}, Username: ${supervisor.username}, Role: ${supervisor.role}`);
      console.log(`   Employee ID: ${supervisor.employeeId}`);
      console.log(`   First Name: ${supervisor.firstname}, Last Name: ${supervisor.lastname}`);
      console.log('---');
    });
    
    // Also check all users to see role distribution
    const allUsers = await User.findAll({
      attributes: ['role', [sequelize.fn('COUNT', sequelize.col('role')), 'count']],
      group: ['role']
    });
    
    console.log("\n📈 User role distribution:");
    allUsers.forEach(user => {
      console.log(`${user.role}: ${user.dataValues.count} users`);
    });
    
    // Test login for a supervisor if any exist
    if (supervisors.length > 0) {
      console.log("\n🔐 Testing supervisor login process...");
      const testSupervisor = supervisors[0];
      console.log(`Testing with supervisor: ${testSupervisor.username}`);
      
      // Try to find the user as the login process would
      const loginTest = await User.findOne({
        where: { username: testSupervisor.username }
      });
      
      if (loginTest) {
        console.log("✅ Supervisor user found in login test");
        console.log(`Role: ${loginTest.role}`);
      } else {
        console.log("❌ Supervisor user NOT found in login test");
      }
    }
    
  } catch (error) {
    console.error("❌ Error checking supervisors:", error);
  } finally {
    await sequelize.close();
  }
}

checkSupervisors();