import sequelize from "../config/database.js";
import User from "../models/user.js";
import Employee from "../models/employee.js";
import bcrypt from "bcryptjs";

async function createSupervisor() {
  try {
    console.log("🔍 Creating supervisor user...");
    
    // Option 1: Create a new supervisor user
    const supervisorData = {
      username: "supervisor",
      firstname: "System",
      lastname: "Supervisor",
      password: await bcrypt.hash("supervisor123", 10),
      role: "supervisor",
      employeeId: null // Can be linked to an employee later if needed
    };
    
    // Check if supervisor username already exists
    const existingUser = await User.findOne({ where: { username: supervisorData.username } });
    
    if (existingUser) {
      console.log("⚠️ User 'supervisor' already exists. Updating role to supervisor...");
      await existingUser.update({ role: 'supervisor' });
      console.log("✅ Updated existing user to supervisor role");
    } else {
      const newSupervisor = await User.create(supervisorData);
      console.log("✅ Created new supervisor user:");
      console.log(`   ID: ${newSupervisor.id}`);
      console.log(`   Username: ${newSupervisor.username}`);
      console.log(`   Role: ${newSupervisor.role}`);
      console.log(`   Password: supervisor123 (please change after first login)`);
    }
    
    // Option 2: Also show how to convert an existing employee to supervisor
    console.log("\n📋 Available employees that could be promoted to supervisor:");
    const employees = await User.findAll({
      where: { role: 'employee' },
      limit: 5
    });
    
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ID: ${emp.id}, Username: ${emp.username}`);
    });
    
    if (employees.length > 0) {
      console.log("\n💡 To promote an employee to supervisor, you can run:");
      console.log(`   UPDATE Users SET role = 'supervisor' WHERE id = [employee_id];`);
    }
    
    // Verify supervisor creation
    const supervisors = await User.findAll({ where: { role: 'supervisor' } });
    console.log(`\n✅ Total supervisors in system: ${supervisors.length}`);
    
  } catch (error) {
    console.error("❌ Error creating supervisor:", error);
  } finally {
    await sequelize.close();
  }
}

createSupervisor();