import Employee from "../models/employee.js";
import User from "../models/user.js";
import Department from "../models/department.js";
import EmployeeSchedule from "../models/employeeSchedule.js";
import Attendance from "../models/attendance.js";
import bcrypt from "bcryptjs";

export const getAllEmployees = async () => {
  return await Employee.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const createEmployee = async (employeeData) => {
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
  
  const employee = await Employee.create(processedData);
  
  // Auto-create user account for Team Leaders
  if (employeeData.position === "Team Leader") {
    try {
      const defaultPassword = await bcrypt.hash("teamleader123", 10);
      await User.create({
        username: employeeData.employee_id,
        password: defaultPassword,
        role: "teamleader",
        employeeId: employee.id,
      });
      console.log(`✅ User account created for Team Leader: ${employeeData.employee_id}`);
    } catch (error) {
      console.error(`❌ Failed to create user account for ${employeeData.employee_id}:`, error);
    }
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

  await employee.update(updates);
  return employee;
};

export const getEmployeeByEmployeeId = async (employee_id) => {
  const employee = await Employee.findOne({
    where: { employee_id },
  });
  
  if (!employee) {
    return null;
  }
  
  // Convert to the format expected by the biometric app
  const employeeData = employee.toJSON();
  
  // Ensure fullname is populated for biometric app compatibility
  let fullname = employeeData.fullname;
  if (!fullname || fullname.trim() === '') {
    if (employeeData.firstname && employeeData.lastname) {
      fullname = `${employeeData.firstname} ${employeeData.lastname}`;
    } else if (employeeData.firstname) {
      fullname = employeeData.firstname;
    } else {
      fullname = `Employee ${employee_id}`;
    }
  }
  
  // Return in the format expected by biometric app
  return {
    ...employeeData,
    employeeId: employeeData.employee_id, // Map employee_id to employeeId for C# app
    fullname: fullname,
    department: employeeData.department || 'No Department'
  };
};
