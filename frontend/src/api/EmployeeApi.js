import api from "./axiosConfig"

// Fetch all employees
export const fetchEmployees = async () => {
  const response = await api.get("/employees");
  return response.data;
};

// Add a new employee
export const addEmployee = async (employeeData) => {
  const response = await api.post("/employees", employeeData);
  return response.data;
};

// Delete an employee
export const deleteEmployee = async (id) => {
  const response = await api.delete(`/employees/${id}`);
  return response.data;
};

// Update an employee
export const updateEmployee = async (id, employeeData) => {
  const response = await api.put(`/employees/${id}`, employeeData);
  return response.data;
};
