import axios from "axios";

const API_URL = "http://localhost:5000/api/schedules";

export const getAllSchedules = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const getAllTemplates = async () => {
  const response = await axios.get(`${API_URL}/templates`);
  return response.data;
};

export const getDepartmentTemplates = async (department) => {
  const response = await axios.get(`${API_URL}/templates/department/${department}`);
  return response.data;
};

export const getEmployeeSchedules = async (employeeId) => {
  const response = await axios.get(`${API_URL}/employee/${employeeId}`);
  return response.data;
};

export const getSchedulesByEmployeeId = async (employeeId) => {
  const response = await axios.get(`${API_URL}/employee/${employeeId}`);
  return response.data;
};

export const createSchedule = async (scheduleData) => {
  const response = await axios.post(API_URL, scheduleData);
  return response.data;
};

export const updateSchedule = async (id, scheduleData) => {
  const response = await axios.put(`${API_URL}/${id}`, scheduleData);
  return response.data;
};

export const deleteSchedule = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};
