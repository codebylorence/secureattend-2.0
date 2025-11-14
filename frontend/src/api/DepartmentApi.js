import api from "./axiosConfig";

export const fetchDepartments = async () => {
  const response = await api.get("/departments");
  return response.data;
};

export const addDepartment = async (departmentData) => {
  const response = await api.post("/departments", departmentData);
  return response.data;
};

export const updateDepartment = async (id, departmentData) => {
  const response = await api.put(`/departments/${id}`, departmentData);
  return response.data;
};

export const deleteDepartment = async (id) => {
  const response = await api.delete(`/departments/${id}`);
  return response.data;
};
