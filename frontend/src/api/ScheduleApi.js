import axios from "axios";

const API_URL = "http://localhost:5000/api/schedules";
const TEMPLATE_API_URL = "http://localhost:5000/api/templates";
const EMPLOYEE_SCHEDULE_API_URL = "http://localhost:5000/api/employee-schedules";

// ============================================
// NEW API - Templates (Phase 2)
// ============================================

export const getTemplates = async () => {
  const response = await axios.get(TEMPLATE_API_URL);
  return response.data;
};

export const getTemplatesByDepartment = async (department) => {
  const response = await axios.get(`${TEMPLATE_API_URL}/department/${department}`);
  return response.data;
};

export const getTemplateById = async (id) => {
  const response = await axios.get(`${TEMPLATE_API_URL}/${id}`);
  return response.data;
};

export const createTemplate = async (templateData) => {
  const response = await axios.post(TEMPLATE_API_URL, templateData);
  return response.data;
};

export const updateTemplate = async (id, templateData) => {
  const response = await axios.put(`${TEMPLATE_API_URL}/${id}`, templateData);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await axios.delete(`${TEMPLATE_API_URL}/${id}`);
  return response.data;
};

// ============================================
// NEW API - Employee Schedules (Phase 2)
// ============================================

export const getEmployeeSchedules = async () => {
  const response = await axios.get(EMPLOYEE_SCHEDULE_API_URL);
  return response.data;
};

export const getEmployeeScheduleById = async (employeeId) => {
  const response = await axios.get(`${EMPLOYEE_SCHEDULE_API_URL}/employee/${employeeId}`);
  return response.data;
};

export const getDepartmentSchedules = async (department) => {
  const response = await axios.get(`${EMPLOYEE_SCHEDULE_API_URL}/department/${department}`);
  return response.data;
};

export const assignSchedule = async (assignmentData) => {
  const response = await axios.post(`${EMPLOYEE_SCHEDULE_API_URL}/assign`, assignmentData);
  return response.data;
};

export const updateEmployeeSchedule = async (id, scheduleData) => {
  const response = await axios.put(`${EMPLOYEE_SCHEDULE_API_URL}/${id}`, scheduleData);
  return response.data;
};

export const deleteEmployeeSchedule = async (id) => {
  const response = await axios.delete(`${EMPLOYEE_SCHEDULE_API_URL}/${id}`);
  return response.data;
};

export const removeDaysFromSchedule = async (id, days) => {
  const response = await axios.delete(`${EMPLOYEE_SCHEDULE_API_URL}/${id}/days`, {
    data: { days }
  });
  return response.data;
};

// ============================================
// OLD API - Keep for backward compatibility
// ============================================

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

export const deleteIndividualShift = async (id, shiftData) => {
  const response = await axios.delete(`${API_URL}/${id}/shift`, {
    data: shiftData
  });
  return response.data;
};
