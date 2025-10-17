import Employee from "../models/employee.js";

//  Get all employees
export const getAllEmployees = async () => {
  return await Employee.findAll();
};

//  Add new employee
export const createEmployee = async (employeeData) => {
  return await Employee.create(employeeData);
};

//  Delete employee by ID
export const removeEmployee = async (id) => {
  const deleted = await Employee.destroy({ where: { id } });
  return deleted;
};
