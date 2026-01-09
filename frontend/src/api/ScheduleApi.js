import api from "./axiosConfig.js";

const TEMPLATE_API_URL = "/templates";
const EMPLOYEE_SCHEDULE_API_URL = "/employee-schedules";

// ============================================
// Templates API
// ============================================

export const getTemplates = async () => {
  // Add cache-busting parameter to ensure fresh data
  const timestamp = new Date().getTime();
  const response = await api.get(`${TEMPLATE_API_URL}?_t=${timestamp}`);
  return response.data;
};

export const getTemplatesByDepartment = async (department) => {
  const response = await api.get(`${TEMPLATE_API_URL}/department/${department}`);
  return response.data;
};

export const createTemplate = async (templateData) => {
  const response = await api.post(TEMPLATE_API_URL, templateData);
  return response.data;
};

export const updateTemplate = async (id, templateData) => {
  const response = await api.put(`${TEMPLATE_API_URL}/${id}`, templateData);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await api.delete(`${TEMPLATE_API_URL}/${id}`);
  return response.data;
};

export const publishSchedules = async (publishedBy) => {
  const response = await api.post(`${TEMPLATE_API_URL}/publish`, { published_by: publishedBy });
  return response.data;
};

// ============================================
// Employee Schedules API
// ============================================

export const getEmployeeSchedules = async () => {
  const response = await api.get(EMPLOYEE_SCHEDULE_API_URL);
  return response.data;
};

export const getEmployeeScheduleById = async (employeeId) => {
  const response = await api.get(`${EMPLOYEE_SCHEDULE_API_URL}/employee/${employeeId}`);
  return response.data;
};

export const assignSchedule = async (assignmentData) => {
  const response = await api.post(`${EMPLOYEE_SCHEDULE_API_URL}/assign`, assignmentData);
  return response.data;
};

export const deleteEmployeeSchedule = async (id) => {
  console.log(`🌐 API: Deleting schedule ID: ${id}`);
  
  const response = await api.delete(`${EMPLOYEE_SCHEDULE_API_URL}/${id}`);
  
  console.log(`✅ API: Delete response:`, response.data);
  return response.data;
};

export const removeDaysFromEmployeeSchedule = async (id, days) => {
  console.log(`🌐 API: Removing days from schedule ID: ${id}, days:`, days);
  
  const response = await api.delete(`${EMPLOYEE_SCHEDULE_API_URL}/${id}/days`, {
    data: { days }
  });
  
  console.log(`✅ API: Remove days response:`, response.data);
  return response.data;
};