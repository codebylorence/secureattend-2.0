import api from "./axiosConfig"

// Fetch all employees
export const fetchEmployees = async () => {
  const response = await api.get("/employees");
  return response.data;
};

// Get employee by ID
export const getEmployeeById = async (employeeId) => {
  const response = await api.get(`/employees/${employeeId}`);
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

// Upload employee photo
export const uploadEmployeePhoto = async (id, photoBase64) => {
  const response = await api.put(`/employees/${id}/photo`, { photo: photoBase64 });
  return response.data;
};

// Get fingerprint enrollment status for all employees
export const getFingerprintStatus = async () => {
  const response = await api.get("/employees/fingerprint-status");
  return response.data;
};

// Update user credentials (username and password)
export const updateUserCredentials = async (userId, credentials) => {
  const response = await api.put(`/users/${userId}/credentials`, credentials);
  return response.data;
};
