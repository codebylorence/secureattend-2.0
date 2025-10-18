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

//  Update employee by ID
export const updateEmployee = async (id, updatedData) => {
  const employee = await Employee.findByPk(id);
  if (!employee) return null;

  await employee.update(updatedData);
  return employee;
};
