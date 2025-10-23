import Employee from "../models/employee.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";

//  Get all employees
export const getAllEmployees = async () => {
  return await Employee.findAll();
};

//  Add new employee
export const createEmployee = async (employeeData) => {
  const {
    employee_id,
    fullname,
    department,
    position,
    contact_number,
    email,
    status,
  } = employeeData;

  // Create employee
  const employee = await Employee.create({
    employee_id,
    fullname,
    department,
    position,
    contact_number,
    email,
    status,
  });

  // Default password for new users
  const defaultPassword = "123456";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Determine role based on position
  const normalizedPosition = position ? position.toLowerCase() : "";
  const role = normalizedPosition.includes("team") ? "teamleader" : "employee";

  // Create linked user account
  await User.create({
    username: employee_id,
    password: hashedPassword,
    role,
    employeeId: employee.id,
  });

  return {
    message: "Employee and user account created successfully",
    employee,
    defaultCredentials: { username: employee_id, password: defaultPassword, role },
  };
};


//  Delete employee by ID
export const removeEmployee = async (id) => {
  const deleted = await Employee.destroy({ where: { id } });
  return deleted;
};

//  Update employee by ID
export const updateEmployee = async (id, updatedData) => {
  const employee = await Employee.findByPk(id);
  if (!employee) return null;

  await employee.update(updatedData);
  return employee;
};
