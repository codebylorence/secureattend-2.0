import Employee from "../models/employee.js";
import User from "../models/user.js";
import Department from "../models/department.js";
import EmployeeSchedule from "../models/employeeSchedule.js";
import Attendance from "../models/attendance.js";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";

export const getAllEmployees = async () => {
  return await Employee.findAll({
    include: [
      {
        model: User,
        as: "user",
        attributes: ["role"],
        required: false // LEFT JOIN to include employees without user accounts
      }
    ],
    order: [["createdAt", "DESC"]],
  });
};

export const createEmployee = async (employeeData) => {
  console.log("🔍 Creating employee with data:", JSON.stringify(employeeData, null, 2));
  
  // Validate Employee ID format (TSI followed by 5 digits)
  const employeeIdPattern = /^TSI\d{5}$/;
  if (!employeeIdPattern.test(employeeData.employee_id)) {
    console.log("❌ Invalid Employee ID format:", employeeData.employee_id);
    throw new Error("Employee ID must be in format TSI00123 (TSI followed by 5 digits)");
  }
  
  // Handle both old and new data formats
  const processedData = { ...employeeData };
  
  // If firstname and lastname are provided, also set fullname for backward compatibility
  if (processedData.firstname && processedData.lastname) {
    processedData.fullname = `${processedData.firstname} ${processedData.lastname}`;
  }
  // If only fullname is provided, try to split it into firstname and lastname
  else if (processedData.fullname && !processedData.firstname && !processedData.lastname) {
    const nameParts = processedData.fullname.trim().split(' ');
    processedData.firstname = nameParts[0] || '';
    processedData.lastname = nameParts.slice(1).join(' ') || '';
  }
  
  // Create user account with provided username and password
  if (employeeData.username && employeeData.password) {
    console.log(`🔐 Username and password provided: ${employeeData.username}`);
    
    // Check if username already exists
    const existingUser = await User.findOne({ where: { username: employeeData.username } });
    if (existingUser) {
      console.log(`❌ Username already exists: ${employeeData.username}`);
      throw new Error(`Username '${employeeData.username}' is already taken`);
    }
    
    // Check if employee_id already exists
    const existingEmployee = await Employee.findOne({ where: { employee_id: employeeData.employee_id } });
    if (existingEmployee) {
      console.log(`❌ Employee ID already exists: ${employeeData.employee_id}`);
      throw new Error(`Employee ID '${employeeData.employee_id}' is already taken`);
    }
  } else {
    console.log("⚠️ No username or password provided in employee data");
  }
  
  console.log("📝 Creating employee record...");
  const employee = await Employee.create(processedData);
  console.log(`✅ Employee created with ID: ${employee.id}`);
  
  // Create user account with provided username and password
  if (employeeData.username && employeeData.password) {
    try {
      let userRole = "employee"; // Default role
      
      // Determine role based on position
      if (employeeData.position === "Team Leader") {
        userRole = "teamleader";
      } else if (employeeData.position === "Supervisor") {
        userRole = "supervisor";
      }
      
      console.log(`🔐 Creating user account with role: ${userRole}`);
      const hashedPassword = await bcrypt.hash(employeeData.password, 10);
      
      const newUser = await User.create({
        username: employeeData.username,
        password: hashedPassword,
        role: userRole,
        employeeId: employee.id,
      });
      
      console.log(`✅ User account created successfully with ID: ${newUser.id} for ${employeeData.position || 'Employee'}: ${employeeData.username} with role: ${userRole}`);
      
      // Verify the user was created by querying it back
      const verifyUser = await User.findOne({ where: { username: employeeData.username } });
      if (verifyUser) {
        console.log(`✅ User verification successful: ${verifyUser.username} (ID: ${verifyUser.id})`);
      } else {
        console.log(`❌ User verification failed: Could not find user ${employeeData.username}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to create user account for ${employeeData.username}:`, error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      // If user creation fails, delete the employee to maintain consistency
      await employee.destroy();
      throw new Error(`Failed to create user account: ${error.message}`);
    }
  } else {
    console.log("⚠️ Skipping user account creation - no username/password provided");
  }
  
  return employee;
};

export const removeEmployee = async (id) => {
  console.log(`🔍 Looking for employee with ID: ${id}`);
  const employee = await Employee.findByPk(id);
  if (!employee) {
    console.log(`❌ Employee not found with ID: ${id}`);
    return null;
  }

  console.log(`👤 Found employee: ${employee.firstname} ${employee.lastname} (${employee.employee_id})`);

  try {
    // Delete all related records first to avoid foreign key constraints

    // 1. Delete employee schedules
    console.log(`🗑️ Deleting employee schedules for employee_id: ${employee.employee_id}`);
    const deletedSchedules = await EmployeeSchedule.destroy({
      where: { employee_id: employee.employee_id }
    });
    console.log(`✅ Deleted ${deletedSchedules} schedule records`);

    // 2. Delete attendance records
    console.log(`🗑️ Deleting attendance records for employee_id: ${employee.employee_id}`);
    const deletedAttendance = await Attendance.destroy({
      where: { employee_id: employee.employee_id }
    });
    console.log(`✅ Deleted ${deletedAttendance} attendance records`);

    // 3. Check if this employee is a team leader and update department
    const user = await User.findOne({
      where: { employeeId: id }
    });

    if (user && user.role === "teamleader" && employee.department) {
      console.log(`👑 Employee is a team leader in ${employee.department}, updating department manager`);
      try {
        await Department.update(
          { manager: "No Manager" },
          { where: { name: employee.department } }
        );
        console.log(`✅ Updated ${employee.department} manager to "No Manager"`);
      } catch (error) {
        console.error(`❌ Failed to update department manager:`, error);
      }
    }

    // 4. Delete associated user account if exists
    if (user) {
      console.log(`🗑️ Deleting associated user account for ${user.username}`);
      await User.destroy({ where: { employeeId: id } });
      console.log(`✅ User account deleted`);
    }

    // 5. Finally, delete the employee record
    console.log(`🗑️ Deleting employee record`);
    await employee.destroy();
    console.log(`✅ Employee deleted successfully`);
    
    return true;

  } catch (error) {
    console.error(`❌ Error during employee deletion:`, error);
    throw error; // Re-throw to be handled by controller
  }
};

export const updateEmployee = async (id, updates) => {
  const employee = await Employee.findByPk(id);
  if (!employee) return null;

  // Check if position is being updated
  const positionChanged = updates.position && updates.position !== employee.position;
  
  await employee.update(updates);
  
  // If position changed, update the associated user role (but not password)
  if (positionChanged) {
    try {
      const user = await User.findOne({ where: { employeeId: id } });
      
      if (user) {
        let newRole = "employee"; // Default role
        
        // Determine new role based on position
        if (updates.position === "Team Leader") {
          newRole = "teamleader";
        } else if (updates.position === "Supervisor") {
          newRole = "supervisor";
        }
        
        // Update user role only (keep existing password)
        await user.update({ role: newRole });
        console.log(`✅ Updated user role for ${employee.employee_id}: ${user.role} → ${newRole}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update user role for ${employee.employee_id}:`, error);
      // Don't throw error - employee update should still succeed
    }
  }
  
  return employee;
};

export const getEmployeeByEmployeeId = async (employee_id) => {
  const employee = await Employee.findOne({
    where: { employee_id },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["role"],
        required: false // LEFT JOIN to include employees without user accounts
      }
    ],
  });
  
  if (!employee) {
    return null;
  }
  
  // Convert to the format expected by the biometric app
  const employeeData = employee.toJSON();
  
  // Ensure fullname is populated for biometric app compatibility
  let fullname = employeeData.fullname;
  if (!fullname || fullname.trim() === '' || fullname === 'null') {
    if (employeeData.firstname && employeeData.lastname) {
      fullname = `${employeeData.firstname} ${employeeData.lastname}`;
    } else if (employeeData.firstname) {
      fullname = employeeData.firstname;
    } else {
      fullname = `Employee ${employee_id}`;
    }
  }
  
  // Get role from user relationship
  const role = employeeData.user?.role || 'employee';
  
  // Return in the format expected by biometric app
  return {
    ...employeeData,
    employeeId: employeeData.employee_id, // Map employee_id to employeeId for C# app
    fullname: fullname,
    department: employeeData.department || 'No Department',
    role: role // Include the role from user table
  };
};

export const getEmployeesByDepartment = async (department) => {
  return await Employee.findAll({
    where: {
      department: department,
      status: "Active"
    },
    order: [["createdAt", "DESC"]],
  });
};

export const getSupervisorTeamMembers = async (supervisorDepartment) => {
  return await Employee.findAll({
    where: {
      department: supervisorDepartment,
      status: "Active",
      position: {
        [Op.not]: ["Team Leader", "Supervisor"]
      }
    },
    order: [["createdAt", "DESC"]],
  });
};