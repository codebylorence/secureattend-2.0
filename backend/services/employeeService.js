import Employee from "../models/employee.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";

export const getAllEmployees = async () => {
  return await Employee.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const createEmployee = async (employeeData) => {
  const employee = await Employee.create(employeeData);
  
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
  const employee = await Employee.findByPk(id);
  if (!employee) return null;

  // Delete associated user account if exists
  await User.destroy({ where: { employeeId: id } });

  await employee.destroy();
  return true;
};

export const updateEmployee = async (id, updates) => {
  const employee = await Employee.findByPk(id);
  if (!employee) return null;

  await employee.update(updates);
  return employee;
};

export const getEmployeeByEmployeeId = async (employee_id) => {
  return await Employee.findOne({
    where: { employee_id },
  });
};
